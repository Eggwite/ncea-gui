import fs from "fs";
import path from "path";
import axios from "axios";

import { discoverAdapters } from "../adapters/loader.js";
import { config } from "./config.js";
import {
	DEFAULT_FAVORITE_SOURCE,
	PaperType,
	SOURCE_PRIORITY,
} from "./constants.js";
import { parseQuery, normaliseStandardId, normaliseSubject } from "./models.js";
import { normaliseLevelValue } from "./models.js";
import { ManifestService } from "./manifest.js";
import { prettifyTypeLabel } from "./search/typeLabels.js";
import {
	buildOfflineStandardGroups,
	buildSeedSubjectVocabulary,
	rankSeedStandardCandidates,
} from "./search/seedSearch.js";

// GUI searches can show a slightly larger shortlist without hurting ranking.
const MAX_NON_EXACT_RESULT_GROUPS = 10;
const EXACT_LOOKUP_ADAPTER_TIMEOUT_MS = 8000;

async function fetchWithTimeout(factory, timeoutMs, onTimeout) {
	let timeoutId;
	const timeoutPromise = new Promise((resolve) => {
		timeoutId = setTimeout(() => {
			if (onTimeout) onTimeout();
			resolve([]);
		}, timeoutMs);
	});

	try {
		return await Promise.race([Promise.resolve().then(factory), timeoutPromise]);
	} finally {
		clearTimeout(timeoutId);
	}
}

export class SearchAggregator {
	constructor() {
		this.adapters = [];
		this.adapterMetaByName = new Map();
		this.adapterLoadPromise = null;
		this.manifestService = new ManifestService();
		this.searchIndex = [];
		this.standardResultsMemo = new Map();
		this.seedStandardsCache = null;
		this.seedSubjectVocabularyCache = null;
		this.progressCallback = null;
		// Track adapters that are down; health check runs once per process lifetime
		this.downAdapters = new Set();
		this.healthCheckRun = false;
	}

	async initialise() {
		// Manifest is lazily refreshed during search; initialise ensures file exists.
		this.manifestService.ensureFile();
		await this.ensureAdaptersLoaded();
	}

	async ensureAdaptersLoaded({ forceReload = false } = {}) {
		if (!forceReload && this.adapters.length > 0) {
			return this.adapters;
		}

		if (!forceReload && this.adapterLoadPromise) {
			return this.adapterLoadPromise;
		}

		this.adapterLoadPromise = discoverAdapters()
			.then((entries) => {
				this.adapters = entries.map((entry) => entry.adapter);
				this.adapterMetaByName = new Map(
					entries.map((entry) => [entry.sourceName, entry])
				);
				return this.adapters;
			})
			.finally(() => {
				this.adapterLoadPromise = null;
			});

		return this.adapterLoadPromise;
	}

	/**
	 * One-time health check for all adapters. Runs once per process lifetime.
	 * Adapters that fail to respond quickly (likely down) are marked for skipping.
	 * This prevents timeout hangs when an adapter's source is unavailable.
	 */
	async runHealthChecks() {
		if (this.healthCheckRun) return;
		this.healthCheckRun = true;

		const checks = this.adapters.map(async (adapter) => {
			// Quirky adapter: quick HEAD check to its base URL
			if (adapter.name === "QuirkyAdapter") {
				try {
					await axios.head("https://nzqa-pdf.quirky.codes/", {
						timeout: 5000,
					});
				} catch {
					this.downAdapters.add(adapter.name);
				}
			}
		});

		await Promise.allSettled(checks);
	}

	getActiveAdapters() {
		return this.adapters.filter((a) => !this.downAdapters.has(a.name));
	}

	getSourceDisplayName(sourceName) {
		const key = String(sourceName || "");
		return this.adapterMetaByName.get(key)?.displayName || key;
	}

	getSourceOptions() {
		const names = [...this.adapterMetaByName.keys()];
		const priorityOrder = this.getPriorityOrder();

		names.sort((a, b) => {
			// Preserve configured source preference first, then fall back to alphabetical order.
			const aIndex = priorityOrder.indexOf(a);
			const bIndex = priorityOrder.indexOf(b);
			const aRank = aIndex === -1 ? priorityOrder.length : aIndex;
			const bRank = bIndex === -1 ? priorityOrder.length : bIndex;
			if (aRank !== bRank) return aRank - bRank;
			return a.localeCompare(b);
		});

		return names.map((name) => ({
			value: name,
			label: this.getSourceDisplayName(name),
		}));
	}

	getActiveSourceNames() {
		return new Set(this.adapters.map((adapter) => adapter.name));
	}

	filterActiveSources(papers) {
		const active = this.getActiveSourceNames();
		return papers.filter((paper) => active.has(String(paper.sourceName || "")));
	}

	async getSearchIndex({ refresh = false } = {}) {
		await this.ensureAdaptersLoaded();
		const manifest = this.manifestService.load();

		if (!refresh) {
			const cached = this.filterActiveSources(
				this.manifestService.getAllPapers(manifest)
			);
			if (cached.length > 0) {
				this.searchIndex = cached;
				return cached;
			}
		}

		// Load all adapter indexes in parallel to avoid serial network timeouts
		const adapterPromises = this.adapters.map((adapter) => adapter.getIndex());
		const adapterResults = await Promise.allSettled(adapterPromises);
		let combined = adapterResults
			.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
			.filter(Boolean);

		if (combined.length > 0) {
			this.manifestService.upsertPapers(combined);
		}

		this.searchIndex = combined;
		return combined;
	}

	getPriorityOrder() {
		const favorite = config.get("favorite_source") || DEFAULT_FAVORITE_SOURCE;
		const order = SOURCE_PRIORITY.filter(Boolean);
		if (!order.includes(favorite)) {
			return order;
		}
		return [favorite, ...order.filter((name) => name !== favorite)];
	}

	sourceRank(paper, priorityOrder, manifest = null) {
		const sourceName = paper.sourceName || "";
		const baseIndex = priorityOrder.indexOf(sourceName);
		const indexScore = baseIndex === -1 ? priorityOrder.length + 1 : baseIndex;
		// Source priority adjustment is manifest-driven, so it can override the base order.
		const penalty = this.manifestService.getSourcePriorityAdjustment(
			paper,
			sourceName,
			manifest
		);
		const preferredSource = this.manifestService.getPreferredSource(
			paper,
			manifest
		);
		const preferredBoost =
			// Preferred source gets a slight boost, but never enough to override a
			// clearly better-ranked source.
			preferredSource && preferredSource === sourceName ? -0.5 : 0;
		return indexScore + penalty + preferredBoost;
	}

	sortBySourcePriority(papers, manifest = null) {
		const priorityOrder = this.getPriorityOrder();
		return [...papers].sort((a, b) => {
			const aRank = this.sourceRank(a, priorityOrder, manifest);
			const bRank = this.sourceRank(b, priorityOrder, manifest);
			if (aRank !== bRank) return aRank - bRank;
			return String(a.sourceName).localeCompare(String(b.sourceName));
		});
	}

	isBulkPaper(paper) {
		return paper.type === PaperType.BULK_ZIP;
	}

	async searchExactByStandardId(standardId, { refresh = false } = {}) {
		await this.ensureAdaptersLoaded();
		await this.runHealthChecks();
		const id = normaliseStandardId(standardId);
		if (!id) return [];

		let results = [];
		const manifest = this.manifestService.load();

		if (!refresh && !this.manifestService.isStale(manifest)) {
			results = this.filterActiveSources(
				this.manifestService.getByStandardId(id, manifest)
			);
		}

		if (results.length === 0 || refresh) {
			// Track progress as adapters complete; skip any adapters that failed health check
			const activeAdapters = this.getActiveAdapters();
			let timedOut = false;
			const adapterFetches = activeAdapters.map((adapter, index) =>
				fetchWithTimeout(
					() => adapter.fetchByStandard(id),
					EXACT_LOOKUP_ADAPTER_TIMEOUT_MS,
					() => {
						// Mark that at least one adapter timed out for this lookup
						timedOut = true;
						console.warn(
							`[${adapter.name}] Exact lookup timed out after ${EXACT_LOOKUP_ADAPTER_TIMEOUT_MS}ms`
						);
						// Notify UI about the timeout via progress callback so renderer can show feedback
						if (this.progressCallback) {
							this.progressCallback({
								completed: index + 1,
								total: activeAdapters.length,
								adapter:
									this.adapterMetaByName.get(adapter.name || adapter.sourceName)
										?.displayName ||
									adapter.name ||
									adapter.constructor?.name ||
									adapter.sourceName,
								timeout: true,
								message: `Exact lookup timed out after ${EXACT_LOOKUP_ADAPTER_TIMEOUT_MS}ms`,
							});
						}
					}
				).then(
					(result) => {
						if (this.progressCallback) {
							this.progressCallback({
								completed: index + 1,
								total: activeAdapters.length,
								adapter:
									this.adapterMetaByName.get(adapter.name || adapter.sourceName)
										?.displayName ||
									adapter.name ||
									adapter.constructor?.name ||
									adapter.sourceName,
							});
						}
						return result;
					},
					(error) => {
						const message =
							error && typeof error.message === "string"
								? error.message
								: String(error || "Unknown adapter error");
						console.warn(`[${adapter.name}] Exact lookup failed: ${message}`);
						if (this.progressCallback) {
							this.progressCallback({
								completed: index + 1,
								total: activeAdapters.length,
								adapter:
									this.adapterMetaByName.get(adapter.name || adapter.sourceName)
										?.displayName ||
									adapter.name ||
									adapter.constructor?.name ||
									adapter.sourceName,
								error: true,
								message,
							});
						}
						throw error;
					}
				)
			);

			const fromSources = await Promise.allSettled(adapterFetches);
			results = results.concat(
				fromSources
					.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
					.filter(Boolean)
			);
			if (results.length > 0) {
				this.manifestService.upsertPapers(results);
			}
		}

		// Only use manifest for caching (which has TTL).
		// Don't memoize individual lookups to allow retries of failed adapters.
		return results;
	}

	clearRuntimeMemo() {
		this.standardResultsMemo.clear();
	}

	clearSeedCaches() {
		this.seedStandardsCache = null;
		this.seedSubjectVocabularyCache = null;
	}

	getSeedStandardById(standardId) {
		const id = normaliseStandardId(standardId);
		if (!id) return null;

		return (
			this.loadSeedStandards().find(
				(row) => normaliseStandardId(row?.standardId) === id
			) || null
		);
	}

	formatYearRange(years) {
		if (years.length === 0) return "Unknown";
		if (years.length === 1) return String(years[0]);
		return `${years[0]}-${years[years.length - 1]}`;
	}

	prettifyType(type) {
		return prettifyTypeLabel(type);
	}

	buildLabel(group) {
		const levelDisplay =
			group.level === "scholarship"
				? "Scholarship"
				: Number(group.level) > 0
					? `L${group.level}`
					: "L?";
		return `Standard ${group.standardId} - ${group.title} (${group.subject} ${levelDisplay})`;
	}

	groupResults(papers) {
		const grouped = {};
		const manifest = this.manifestService.load();

		for (const paper of this.sortBySourcePriority(papers, manifest)) {
			const standardKey = paper.standardId;
			const isBulk = this.isBulkPaper(paper);
			const year = Number(paper.year);
			const yearFrom = Number(paper.yearFrom);
			const yearTo = Number(paper.yearTo);
			if (!grouped[standardKey]) {
				const seedStandard = this.getSeedStandardById(standardKey);
				grouped[standardKey] = {
					standardId: paper.standardId,
					level: normaliseLevelValue(paper.level),
					title:
						String(seedStandard?.title || paper.title || "").trim() ||
						`Standard ${paper.standardId}`,
					subject: normaliseSubject(paper.subject),
					credits: seedStandard?.credits,
					entries: {},
				};
			}

			const standardGroup = grouped[standardKey];
			const entryKey = isBulk
				? `bulk_${paper.yearFrom}_${paper.yearTo}`
				: `year_${paper.year}`;

			if (!standardGroup.entries[entryKey]) {
				standardGroup.entries[entryKey] = {
					entryKey,
					isBulk,
					year: isBulk ? null : year,
					yearFrom: isBulk ? yearFrom : null,
					yearTo: isBulk ? yearTo : null,
					papersByType: {},
					sourceSet: new Set(),
				};
			}

			const entry = standardGroup.entries[entryKey];
			entry.sourceSet.add(paper.sourceName);
			if (!entry.papersByType[paper.type]) {
				entry.papersByType[paper.type] = [];
			}
			entry.papersByType[paper.type].push(paper);
		}

		return Object.values(grouped).map((group) => {
			const entries = Object.values(group.entries).map((entry) => {
				const typeChoices = Object.keys(entry.papersByType)
					.sort()
					.map((type) => ({
						type,
						label: this.prettifyType(type),
						papers: this.sortBySourcePriority(entry.papersByType[type], manifest),
						sourceCount: new Set(
							entry.papersByType[type].map((paper) => paper.sourceName)
						).size,
					}));

				const sourceSummary = Array.from(entry.sourceSet).sort().join(", ");
				const typeSummary = typeChoices.map((type) => type.label).join(", ");

				return {
					...entry,
					typeChoices,
					sourceSummary,
					typeSummary,
					label: entry.isBulk
						? `Bulk ZIP ${entry.yearFrom}-${entry.yearTo}`
						: `${entry.year}`,
				};
			});

			entries.sort((a, b) => {
				if (a.isBulk && !b.isBulk) return 1;
				if (!a.isBulk && b.isBulk) return -1;
				if (a.isBulk && b.isBulk) return (a.yearFrom || 0) - (b.yearFrom || 0);
				return (b.year || 0) - (a.year || 0);
			});

			return {
				standardId: group.standardId,
				level: group.level,
				title: group.title,
				subject: group.subject,
				label: this.buildLabel(group),
				entries,
			};
		});
	}

	loadSeedStandards() {
		if (this.seedStandardsCache) {
			return this.seedStandardsCache;
		}

		const appDir = path.dirname(process.argv[1] || process.cwd());
		const candidates = [
			path.resolve(process.cwd(), "seed/standards.json"),
			path.resolve(process.cwd(), "seeds/standards.json"),
			path.resolve(appDir, "seed/standards.json"),
			path.resolve(appDir, "seeds/standards.json"),
			path.resolve(appDir, "dist", "seed", "standards.json"),
			path.resolve(process.cwd(), "electron/seed/standards.json"),
			path.resolve(appDir, "..", "seed/standards.json"),
			path.resolve(process.resourcesPath ?? "", "electron/seed/standards.json"),
			path.resolve(process.resourcesPath ?? "", "seed/standards.json"),
		];

		for (const standardsPath of candidates) {
			if (!fs.existsSync(standardsPath)) continue;
			try {
				const raw = JSON.parse(fs.readFileSync(standardsPath, "utf8"));
				this.seedStandardsCache = Object.values(raw?.standards || {});
				return this.seedStandardsCache;
			} catch {
				this.seedStandardsCache = [];
				return this.seedStandardsCache;
			}
		}

		this.seedStandardsCache = [];
		return this.seedStandardsCache;
	}

	getSeedSubjectVocabulary() {
		if (this.seedSubjectVocabularyCache) {
			return this.seedSubjectVocabularyCache;
		}
		this.seedSubjectVocabularyCache = buildSeedSubjectVocabulary(
			this.loadSeedStandards().filter(Boolean)
		);

		return this.seedSubjectVocabularyCache;
	}

	rankSeedStandardCandidates(parsedQuery, limit = 3) {
		return rankSeedStandardCandidates({
			parsedQuery,
			standards: this.loadSeedStandards().filter((row) => row && row.standardId),
			limit,
		});
	}

	rankSeedStandardIds(parsedQuery, limit = 3) {
		return this.rankSeedStandardCandidates(parsedQuery, limit).map(
			(entry) => entry.standardId
		);
	}

	buildOfflineStandardGroups(standardIds) {
		return buildOfflineStandardGroups({
			standardIds,
			standards: this.loadSeedStandards(),
			buildLabel: this.buildLabel.bind(this),
		});
	}

	async search(rawQuery, options = {}) {
		const trimmedQuery = String(rawQuery || "").trim();
		if (!trimmedQuery) {
			return [];
		}

		let rankedStandardCandidates = [];
		const parsedQuery = parseQuery(rawQuery, {
			subjectVocabulary: this.getSeedSubjectVocabulary(),
		});
		void options;
		rankedStandardCandidates = this.rankSeedStandardCandidates(
			parsedQuery,
			MAX_NON_EXACT_RESULT_GROUPS
		);

		if (rankedStandardCandidates.length === 0) return [];

		const grouped = this.buildOfflineStandardGroups(rankedStandardCandidates);
		const rankMap = new Map(
			rankedStandardCandidates.map((entry, i) => [entry.standardId, i])
		);

		grouped.sort(
			(a, b) =>
				(rankMap.get(a.standardId) ?? Number.MAX_SAFE_INTEGER) -
				(rankMap.get(b.standardId) ?? Number.MAX_SAFE_INTEGER)
		);

		return grouped.slice(0, MAX_NON_EXACT_RESULT_GROUPS);
	}
}
