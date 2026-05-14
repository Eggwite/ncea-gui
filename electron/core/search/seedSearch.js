import Fuse from "fuse.js";

import { cleanSearchText } from "./cleanSearchText.js";
import { buildSubjectAliases } from "./subjectAliases.js";
import {
	scoreSearchTextMatch,
	scoreSearchTokenMatch,
} from "./tokenNormalise.js";
import { normaliseLevelValue, normaliseSubject } from "../models.js";

export function classifySearchConfidence(score, gap) {
	if (score >= 16 && gap >= 4) return "high";
	if (score >= 10 && gap >= 2) return "medium";
	return "low";
}

export function buildSeedSubjectVocabulary(standards = []) {
	const bySubject = new Map();

	for (const row of standards) {
		const subject = normaliseSubject(row?.subject);
		if (!subject || subject === "Unknown") continue;

		if (!bySubject.has(subject)) {
			bySubject.set(subject, {
				subject,
				aliases: new Set(),
			});
		}

		const bucket = bySubject.get(subject);
		for (const alias of buildSubjectAliases(row.subject)) {
			bucket.aliases.add(alias);
		}
	}

	return [...bySubject.values()].map((entry) => ({
		subject: entry.subject,
		aliases: [...entry.aliases],
	}));
}

export function rankSeedStandardCandidates({
	parsedQuery,
	standards = [],
	limit = 3,
}) {
	const validStandards = standards.filter((row) => row && row.standardId);
	if (validStandards.length === 0) return [];

	let filtered = validStandards;
	if (parsedQuery.level) {
		filtered = filtered.filter(
			(row) =>
				normaliseLevelValue(row.level) === normaliseLevelValue(parsedQuery.level)
		);
	}

	if (parsedQuery.subject) {
		const querySubject = normaliseSubject(parsedQuery.subject).toLowerCase();
		const subjectMatched = filtered.filter((row) => {
			const rowSubject = normaliseSubject(row.subject).toLowerCase();
			return rowSubject === querySubject || rowSubject.includes(querySubject);
		});
		if (subjectMatched.length > 0) {
			filtered = subjectMatched;
		}
	}

	const searchQuery = cleanSearchText(parsedQuery.raw, parsedQuery.level);
	const queryTerms = searchQuery.split(" ").filter(Boolean);
	const subjectAliasTokens = parsedQuery.subject
		? new Set(
				buildSubjectAliases(parsedQuery.subject)
					.flatMap((alias) => alias.split(/\s+/))
					.map((token) => cleanSearchText(token).trim())
					.filter(Boolean)
			)
		: new Set();
	const rankingQueryTerms =
		parsedQuery.subjectConfidence === "explicit"
			? queryTerms.filter(
					(token) =>
						!Array.from(subjectAliasTokens).some(
							(aliasToken) => scoreSearchTokenMatch(token, aliasToken) >= 8
						)
				)
			: queryTerms;
	const effectiveQueryTerms =
		rankingQueryTerms.length > 0 ? rankingQueryTerms : queryTerms;

	const scoreStandard = (row) => {
		const titleText = cleanSearchText(row.shortTitle || row.title || "");
		const subjectText = cleanSearchText(row.subject || "");
		const titleScore = scoreSearchTextMatch(
			effectiveQueryTerms,
			titleText.split(" ")
		);
		const subjectScore = scoreSearchTextMatch(
			effectiveQueryTerms,
			subjectText.split(" ")
		);
		return titleScore + Math.min(subjectScore, 6);
	};

	if (!searchQuery) {
		return filtered.slice(0, limit).map((row) => ({
			standardId: String(row.standardId),
			score: 0,
			fuseScore: 1,
			confidence: "low",
		}));
	}

	const fuseCandidates = new Fuse(filtered, {
		keys: ["standardId", "shortTitle", "title", "subject"],
		threshold: parsedQuery.subject ? 0.32 : 0.42,
		ignoreLocation: true,
		includeScore: true,
	})
		.search(searchQuery)
		.sort((a, b) => {
			const aScore = scoreStandard(a.item);
			const bScore = scoreStandard(b.item);
			if (aScore !== bScore) return bScore - aScore;
			if ((a.score ?? 0) !== (b.score ?? 0)) {
				return (a.score ?? 0) - (b.score ?? 0);
			}
			return String(a.item.standardId).localeCompare(String(b.item.standardId));
		});

	const candidates =
		fuseCandidates.length > 0
			? fuseCandidates
			: filtered.map((item) => ({ item, score: 1 }));

	const scored = candidates.map(({ item, score }) => ({
		standardId: String(item.standardId),
		item,
		score: scoreStandard(item),
		fuseScore: score ?? 1,
	}));

	scored.sort((a, b) => {
		if (a.score !== b.score) return b.score - a.score;
		if (a.fuseScore !== b.fuseScore) return a.fuseScore - b.fuseScore;
		return a.standardId.localeCompare(b.standardId);
	});

	const dedupedEntries = [];
	const seen = new Set();
	for (const entry of scored) {
		if (seen.has(entry.standardId)) continue;
		seen.add(entry.standardId);
		dedupedEntries.push(entry);
	}

	if (dedupedEntries.length > 0) {
		const topScore = dedupedEntries[0]?.score ?? 0;
		const secondScore = dedupedEntries[1]?.score ?? 0;
		const gap = topScore - secondScore;
		const confidence = classifySearchConfidence(topScore, gap);
		return dedupedEntries.slice(0, limit).map((entry) => ({
			standardId: entry.standardId,
			score: entry.score,
			fuseScore: entry.fuseScore,
			confidence,
			matchGap: gap,
		}));
	}

	if (parsedQuery.subject || parsedQuery.level) {
		return filtered.slice(0, limit).map((row) => ({
			standardId: String(row.standardId),
			score: 0,
			fuseScore: 1,
			confidence: "low",
		}));
	}

	return [];
}

export function buildOfflineStandardGroups({
	standardIds = [],
	standards = [],
	buildLabel,
}) {
	const byId = new Map(standards.map((row) => [String(row.standardId), row]));

	return standardIds
		.map((id) => {
			const standardId = String(id?.standardId || id);
			const row = byId.get(standardId);
			if (!row) return null;
			const matchScore = typeof id === "object" ? (id.score ?? null) : null;
			const matchGap = typeof id === "object" ? (id.matchGap ?? null) : null;
			const matchConfidence =
				typeof id === "object" ? (id.confidence ?? null) : null;
			const normalisedLevel = normaliseLevelValue(row.level);
			const title = String(
				row.shortTitle || row.title || `Standard ${standardId}`
			);
			const subject = normaliseSubject(row.subject);
			return {
				standardId,
				level: normalisedLevel,
				title,
				subject,
				credits: row.credits,
				matchScore,
				matchGap,
				matchConfidence,
				label: buildLabel({
					standardId,
					level: normalisedLevel,
					title,
					subject,
				}),
				entries: [],
			};
		})
		.filter(Boolean);
}
