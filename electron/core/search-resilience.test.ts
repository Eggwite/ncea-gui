/* @vitest-environment node */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { CacheService } from "./cache.js";
import { SearchAggregator } from "./search.js";
import {
	buildSeedSubjectVocabulary,
	classifySearchConfidence,
	rankSeedStandardCandidates,
} from "./search/seedSearch.js";
import { ManifestService } from "./manifest.js";
import { NoBrainTooSmallAdapter } from "../adapters/noBrain.js";
import { discoverAdapters } from "../adapters/loader.js";
import { PaperSourceAdapter } from "../adapters/index.js";

type ProgressEvent = {
	completed?: number;
	total?: number;
	adapter?: string;
	error?: boolean;
	timeout?: boolean;
	message?: string;
};

type SearchPaperResult = {
	sourceName: string;
	standardId: string;
};

type DiscoveredAdapterEntry = {
	adapter: { name: string };
	sourceName: string;
	displayName: string;
};

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

		const progressEvents: ProgressEvent[] = [];
		const fastAdapter = {
			name: "FastAdapter",
			sourceName: "FastAdapter",
			fetchByStandard() {
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
			fetchByStandard() {
				return new Promise(() => {});
			},
		};

		const aggregator = new SearchAggregator();
		aggregator.adapters = [fastAdapter, slowAdapter];
		aggregator.adapterMetaByName = new Map([
			[fastAdapter.sourceName, { displayName: "Fast Adapter" }],
			[slowAdapter.sourceName, { displayName: "Slow Adapter" }],
		]);
		const manifestService = new ManifestService();
		vi.spyOn(manifestService, "load").mockReturnValue({
			generated: new Date().toISOString(),
			ttl_hours: 72,
			entries: {},
		});
		vi.spyOn(manifestService, "isStale").mockReturnValue(true);
		vi.spyOn(manifestService, "getByStandardId").mockReturnValue([]);
		vi.spyOn(manifestService, "upsertPapers").mockImplementation(() => {});
		vi.spyOn(manifestService, "ensureFile").mockImplementation(() => {});
		aggregator.manifestService = manifestService;
		aggregator.progressCallback = (event: ProgressEvent) => progressEvents.push(event);

		const searchPromise = aggregator.searchExactByStandardId("91606", {
			refresh: true,
		});

		await vi.advanceTimersByTimeAsync(8000);
		const result = (await searchPromise) as SearchPaperResult[];

		expect(result).toHaveLength(1);
		expect(result[0].sourceName).toBe("FastAdapter");
		expect(progressEvents.some((event) => event.timeout)).toBe(true);
		expect(progressEvents.some((event) => event.adapter === "Slow Adapter")).toBe(true);
		expect(progressEvents[progressEvents.length - 1]?.completed).toBe(2);
	});

	it("falls back to adapter.name when sourceName is missing", async () => {
		vi.useFakeTimers();

		const progressEvents: ProgressEvent[] = [];
		const fastAdapter = {
			name: "FastAdapter",
			fetchByStandard() {
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
			fetchByStandard() {
				return new Promise(() => {});
			},
		};

		const aggregator = new SearchAggregator();
		aggregator.adapters = [fastAdapter, slowAdapter];
		aggregator.adapterMetaByName = new Map([
			[fastAdapter.name, { displayName: "Fast Adapter" }],
			[slowAdapter.name, { displayName: "Slow Adapter" }],
		]);
		const manifestService = new ManifestService();
		vi.spyOn(manifestService, "load").mockReturnValue({
			generated: new Date().toISOString(),
			ttl_hours: 72,
			entries: {},
		});
		vi.spyOn(manifestService, "isStale").mockReturnValue(true);
		vi.spyOn(manifestService, "getByStandardId").mockReturnValue([]);
		vi.spyOn(manifestService, "upsertPapers").mockImplementation(() => {});
		vi.spyOn(manifestService, "ensureFile").mockImplementation(() => {});
		aggregator.manifestService = manifestService;
		aggregator.progressCallback = (event: ProgressEvent) => progressEvents.push(event);

		const searchPromise = aggregator.searchExactByStandardId("91606", {
			refresh: true,
		});

		await vi.advanceTimersByTimeAsync(8000);
		const result = (await searchPromise) as SearchPaperResult[];

		expect(result).toHaveLength(1);
		expect(result[0].sourceName).toBe("FastAdapter");
		expect(progressEvents.some((event) => event.timeout)).toBe(true);
		expect(progressEvents.some((event) => event.adapter === "Slow Adapter")).toBe(true);
	});
});

describe("adapter cache retry behavior", () => {
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
		expect(result[0]?.standardId).toBe("91606");
		expect(setSpy).toHaveBeenCalledTimes(1);
	});
});

describe("seed search ranking", () => {
	it("drops explicit subject alias noise before ranking", () => {
		const standards: Array<{
			standardId: string;
			title: string;
			subject: string;
			level: number;
		}> = [
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
			standards: standards as never[],
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
			requireFn: (modulePath: string) => {
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

	it("discovers built-in adapters with non-empty names", async () => {
		const adapters = (await discoverAdapters()) as DiscoveredAdapterEntry[];

		expect(adapters.length).toBeGreaterThan(0);
		for (const entry of adapters) {
			expect(typeof entry.adapter.name).toBe("string");
			expect(entry.adapter.name.trim()).not.toBe("");
			expect(entry.sourceName).toBe(entry.adapter.name);
		}
	});

	it("skips adapters with blank instance names during discovery", async () => {
		class GoodAdapter extends PaperSourceAdapter {
			static sourceName = "GoodAdapter";

			fetchByStandard() {
				return Promise.resolve([]);
			}
		}

		class BlankNameAdapter extends PaperSourceAdapter {
			static sourceName = "BlankNameAdapter";

			constructor() {
				super();
				this.name = "";
			}

			fetchByStandard() {
				return Promise.resolve([]);
			}
		}

		const discovered = await discoverAdapters({
			adaptersDir: "C:/fake/adapters",
			fsModule: {
				readdirSync: () => [
					{ isFile: () => true, name: "good.js" },
					{ isFile: () => true, name: "blank.js" },
					{ isFile: () => true, name: "loader.js" },
					{ isFile: () => true, name: "index.js" },
				],
			},
			requireFn: (modulePath: string) => {
				if (modulePath.endsWith("good.js")) {
					return { GoodAdapter };
				}
				if (modulePath.endsWith("blank.js")) {
					return { BlankNameAdapter };
				}
				throw new Error("Unexpected module path");
			},
		});

		expect(discovered.map((entry) => entry.sourceName)).toEqual(["GoodAdapter"]);
	});
});