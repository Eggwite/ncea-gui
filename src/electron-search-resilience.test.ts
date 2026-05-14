/* @vitest-environment node */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { CacheService } from "../electron/core/cache.js";
import { SearchAggregator } from "../electron/core/search.js";
import {
	buildSeedSubjectVocabulary,
	classifySearchConfidence,
	rankSeedStandardCandidates,
} from "../electron/core/search/seedSearch.js";
import { StudyTimeAdapter } from "../electron/adapters/studyTime.js";
import { NoBrainTooSmallAdapter } from "../electron/adapters/noBrain.js";
import { discoverAdapters } from "../electron/adapters/loader.js";
import { PaperSourceAdapter } from "../electron/adapters/index.js";

beforeEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe("SearchAggregator exact lookup", () => {
	it("times out a slow adapter and still returns the fast result", async () => {
		vi.useFakeTimers();

		const progressEvents = [];
		const fastAdapter = {
			name: "FastAdapter",
			sourceName: "FastAdapter",
			async fetchByStandard() {
				return [
					{
						standardId: "91606",
						subject: "Mathematics",
						title: "Fast result",
						level: 1,
						year: 2024,
						format: "pdf",
						url: "https://example.test/fast.pdf",
						sourceName: "FastAdapter",
						filename: "fast.pdf",
						type: "exam",
					},
				];
			},
		};
		const slowAdapter = {
			name: "SlowAdapter",
			sourceName: "SlowAdapter",
			async fetchByStandard() {
				return new Promise(() => {});
			},
		};

		const aggregator = new SearchAggregator();
		aggregator.adapters = [fastAdapter, slowAdapter];
		aggregator.adapterMetaByName = new Map([
			[fastAdapter.sourceName, { displayName: "Fast Adapter" }],
			[slowAdapter.sourceName, { displayName: "Slow Adapter" }],
		]);
		aggregator.manifestService = {
			load: () => ({ generated: new Date().toISOString(), ttl_hours: 72, entries: {} }),
			isStale: () => true,
			getByStandardId: () => [],
			upsertPapers: vi.fn(),
			ensureFile: vi.fn(),
		};
		aggregator.progressCallback = (event) => progressEvents.push(event);

		const searchPromise = aggregator.searchExactByStandardId("91606", {
			refresh: true,
		});

		await vi.advanceTimersByTimeAsync(8000);
		const result = await searchPromise;

		expect(result).toHaveLength(1);
		expect(result[0].sourceName).toBe("FastAdapter");
		expect(progressEvents.some((event) => event.timeout)).toBe(true);
		expect(progressEvents.some((event) => event.adapter === "Slow Adapter")).toBe(true);
		expect(progressEvents.at(-1)?.completed).toBe(2);
	});
});

describe("adapter cache retry behavior", () => {
	it("retries an empty StudyTime crawl and only caches non-empty results", async () => {
		const cache = new Map();
		const setSpy = vi.spyOn(CacheService, "set").mockImplementation((key, payload) => {
			cache.set(key, payload);
		});
		vi.spyOn(CacheService, "get").mockImplementation((key) => {
			return cache.has(key) ? cache.get(key) : null;
		});
		const crawlSpy = vi
			.spyOn(StudyTimeAdapter.prototype, "_crawlAll")
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					standardId: "91606",
					subject: "Mathematics",
					title: "Algebra",
					level: 1,
					year: 2024,
					format: "pdf",
					url: "https://example.test/studytime.pdf",
					sourceName: "StudyTimeAdapter",
					filename: "studytime.pdf",
					type: "exam",
				},
			]);

		const adapter = new StudyTimeAdapter();

		const first = await adapter.fetchByStandard("91606");
		const second = await adapter.fetchByStandard("91606");
		const third = await adapter.fetchByStandard("91606");

		expect(first).toEqual([]);
		expect(second).toHaveLength(1);
		expect(third).toHaveLength(1);
		expect(crawlSpy).toHaveBeenCalledTimes(2);
		expect(setSpy).toHaveBeenCalledTimes(1);
	});

	it("refreshes NoBrain when the cached crawl misses the requested standard", async () => {
		vi.spyOn(CacheService, "get").mockReturnValue([
			{
				standardId: "99999",
				subject: "Mathematics",
				title: "Other paper",
				level: 1,
				year: 2024,
				format: "pdf",
				url: "https://example.test/other.pdf",
				sourceName: "NoBrainTooSmallAdapter",
				filename: "other.pdf",
				type: "exam",
			},
		]);
		const crawlSpy = vi
			.spyOn(NoBrainTooSmallAdapter.prototype, "_crawlAll")
			.mockResolvedValue([
				{
					standardId: "91606",
					subject: "Mathematics",
					title: "Target paper",
					level: 1,
					year: 2024,
					format: "pdf",
					url: "https://example.test/target.pdf",
					sourceName: "NoBrainTooSmallAdapter",
					filename: "target.pdf",
					type: "exam",
				},
			]);
		const setSpy = vi.spyOn(CacheService, "set").mockImplementation(() => {});

		const adapter = new NoBrainTooSmallAdapter();
		const result = await adapter.fetchByStandard("91606");

		expect(crawlSpy).toHaveBeenCalledTimes(1);
		expect(result).toHaveLength(1);
		expect(result[0].standardId).toBe("91606");
		expect(setSpy).toHaveBeenCalledTimes(1);
	});
});

describe("seed search ranking", () => {
	it("drops explicit subject alias noise before ranking", () => {
		const standards = [
			{
				standardId: "91001",
				title: "Genetics",
				subject: "Biology",
				level: 1,
			},
			{
				standardId: "91002",
				title: "Biology in Context",
				subject: "Biology",
				level: 1,
			},
		];

		const results = rankSeedStandardCandidates({
			parsedQuery: {
				raw: "biology genetics",
				subject: "Biology",
				subjectConfidence: "explicit",
				level: null,
			},
			standards,
			limit: 2,
		});

		expect(results[0].standardId).toBe("91001");
		expect(results[0].confidence).toBe("medium");
	});

	it("classifies confidence bands at the expected boundaries", () => {
		expect(classifySearchConfidence(17, 4)).toBe("high");
		expect(classifySearchConfidence(10, 2)).toBe("medium");
		expect(classifySearchConfidence(9, 1)).toBe("low");
	});

	it("builds seed vocabulary from combined subject names", () => {
		const vocabulary = buildSeedSubjectVocabulary([
			{ subject: "Business Studies & Economics" },
		]);

		expect(vocabulary).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ subject: "Business Studies Economics" }),
			]),
		);
	});
});

describe("adapter loader resilience", () => {
	it("skips broken modules and duplicate source names", async () => {
		class GoodAdapter extends PaperSourceAdapter {
			static sourceName = "DuplicateAdapter";
			static displayName = "Duplicate Adapter";
		}

		class DuplicateAdapter extends PaperSourceAdapter {
			static sourceName = "DuplicateAdapter";
			static displayName = "Duplicate Adapter 2";
		}

		const dirents = [
			{ isFile: () => true, name: "good.js" },
			{ isFile: () => true, name: "broken.js" },
			{ isFile: () => true, name: "duplicate.js" },
			{ isFile: () => true, name: "loader.js" },
			{ isFile: () => true, name: "index.js" },
		];

		const adapters = await discoverAdapters({
			adaptersDir: "C:/fake/adapters",
			fsModule: {
				readdirSync: () => dirents,
			},
			requireFn: (modulePath) => {
				if (modulePath.endsWith("good.js")) {
					return { GoodAdapter };
				}
				if (modulePath.endsWith("duplicate.js")) {
					return { DuplicateAdapter };
				}
				throw new Error("broken module");
			},
		});

		expect(adapters).toHaveLength(1);
		expect(adapters[0].sourceName).toBe("DuplicateAdapter");
		expect(adapters[0].displayName).toBe("Duplicate Adapter 2");
	});
});