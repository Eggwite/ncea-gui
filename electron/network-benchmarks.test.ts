/* @vitest-environment node */

import http from "node:http";
import { performance } from "node:perf_hooks";

import axios from "axios";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import { CacheService } from "./core/cache.js";
import { OurExamsAdapter } from "./adapters/ourExams.js";
import { QuirkyAdapter } from "./adapters/quirky.js";
import { SearchAggregator } from "./core/search.js";
import { ManifestService } from "./core/manifest.js";

type ProgressEvent = {
	completed?: number;
	total?: number;
	adapter?: string;
	error?: boolean;
	timeout?: boolean;
	message?: string;
};

const realAxiosGet = axios.get.bind(axios);
const realAxiosHead = axios.head.bind(axios);

let server: http.Server | undefined;
let baseUrl = "";
let scenario = "steady";
let requestCounts = new Map<string, number>();

function rewriteUrl(input: unknown) {
	const url = String(input || "");
	if (url === "https://www.ourexams.org/searchIndex.json") {
		return `${baseUrl}/ourexams/searchIndex.json`;
	}
	if (url.startsWith("https://nzqa-pdf.quirky.codes/standard/")) {
		return `${baseUrl}/quirky${new URL(url).pathname}`;
	}
	if (url === "https://nzqa-pdf.quirky.codes/" || url === "https://nzqa-pdf.quirky.codes") {
		return `${baseUrl}/quirky/`;
	}
	return url;
}

async function measureLatency<T>(action: () => Promise<T> | T): Promise<{ value: T; ms: number }> {
	const startedAt = performance.now();
	const value = await action();
	return {
		value,
		ms: performance.now() - startedAt,
	};
}

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown) {
	res.writeHead(statusCode, {
		"content-type": "application/json",
	});
	res.end(JSON.stringify(payload));
}

function sendText(res: http.ServerResponse, statusCode: number, body: string) {
	res.writeHead(statusCode, {
		"content-type": "text/plain",
	});
	res.end(body);
}

beforeAll(async () => {
	const testServer = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
		const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
		const routeKey = `${req.method || "GET"} ${requestUrl.pathname}`;
		const count = (requestCounts.get(routeKey) || 0) + 1;
		requestCounts.set(routeKey, count);

		if (requestUrl.pathname === "/" || requestUrl.pathname === "/base") {
			await new Promise((resolve) => setTimeout(resolve, 5));
			sendText(res, 200, "base");
			return;
		}

		if (requestUrl.pathname === "/quirky/" && req.method === "HEAD") {
			res.writeHead(200);
			res.end();
			return;
		}

		if (
			requestUrl.pathname === "/quirky/standard/91606" &&
			req.method === "GET"
		) {
			await new Promise((resolve) => setTimeout(resolve, 60));
			if (scenario === "flaky" && count === 1) {
				sendJson(res, 503, { message: "temporary outage" });
				return;
			}

			sendJson(res, 200, {
				message: "success",
				rows: [
					{
						location: "mathematics/level_1/exm-2024-91606-paper.pdf",
						fileName: "91606 examination paper 2024.pdf",
					},
				],
			});
			return;
		}

		if (
			requestUrl.pathname === "/ourexams/searchIndex.json" &&
			req.method === "GET"
		) {
			await new Promise((resolve) => setTimeout(resolve, 25));
			if (scenario === "ourexams-error") {
				sendJson(res, 500, { error: "upstream failure" });
				return;
			}

			sendJson(res, 200, [
				{
					number: "91606",
					title: "Algebra",
					subject: "Mathematics",
					level: 1,
					"start-year": 2020,
					"end-year": 2024,
				},
			]);
			return;
		}

		sendJson(res, 404, { error: `Missing fixture for ${routeKey}` });
	});
	server = testServer;

	await new Promise((resolve) => {
		testServer.listen(0, "127.0.0.1", () => {
			const address = testServer.address();
			if (!address || typeof address === "string") {
				throw new Error("Test server failed to start");
			}
			baseUrl = `http://127.0.0.1:${address.port}`;
			resolve(null);
		});
	});
});

afterAll(async () => {
	if (!server) return;
	const testServer = server;
	await new Promise((resolve) => testServer.close(() => resolve(null)));
});

beforeEach(() => {
	scenario = "steady";
	requestCounts = new Map();
	vi.restoreAllMocks();

	const cache = new Map();
	vi.spyOn(CacheService, "get").mockImplementation((key) => {
		return cache.has(key) ? cache.get(key) : null;
	});
	vi.spyOn(CacheService, "set").mockImplementation((key, payload) => {
		cache.set(key, payload);
	});
	vi.spyOn(CacheService, "getOrSet").mockImplementation(async (key, _ttl, factory) => {
		if (cache.has(key)) {
			return cache.get(key);
		}
		const payload = await factory();
		if (payload !== undefined) {
			cache.set(key, payload);
		}
		return payload;
	});
	vi.spyOn(CacheService, "clear").mockImplementation(() => {
		cache.clear();
	});

	vi.spyOn(axios, "get").mockImplementation((url, config) => {
		return realAxiosGet(rewriteUrl(url), config);
	});
	vi.spyOn(axios, "head").mockImplementation((url, config) => {
		return realAxiosHead(rewriteUrl(url), config);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("adapter network benchmarks", () => {
	it("compares Quirky standard fetch latency against a base-domain baseline", async () => {
		const baseline = await measureLatency(() => axios.get(`${baseUrl}/`));
		const adapter = new QuirkyAdapter();

		const fetched = await measureLatency(() => adapter.fetchByStandard("91606"));

		expect(fetched.value).toHaveLength(1);
		expect(fetched.ms).toBeGreaterThan(baseline.ms + 20);
		expect(fetched.ms - baseline.ms).toBeLessThan(250);
	});

	it("recovers from a flaky adapter response after an initial network failure", async () => {
		scenario = "flaky";
		const adapter = new QuirkyAdapter();

		const first = await measureLatency(() => adapter.fetchByStandard("91606"));
		const second = await measureLatency(() => adapter.fetchByStandard("91606"));

		expect(first.value).toEqual([]);
		expect(second.value).toHaveLength(1);
		expect(second.ms).toBeLessThan(first.ms + 250);
	});

	it("treats upstream adapter failures as empty results instead of throwing", async () => {
		scenario = "ourexams-error";
		const adapter = new OurExamsAdapter();

		const result = await adapter.fetchByStandard("91606");

		expect(result).toEqual([]);
	});
});

describe("search fault tolerance", () => {
	it("returns good results when one adapter fails", async () => {
		const aggregator = new SearchAggregator();
		const progressEvents: ProgressEvent[] = [];
		const goodAdapter = {
			name: "GoodAdapter",
			sourceName: "GoodAdapter",
			async fetchByStandard() {
				await new Promise((resolve) => setTimeout(resolve, 20));
				return [
					{
						standardId: "91606",
						subject: "Mathematics",
						title: "Algebra",
						level: 1,
						year: 2024,
						format: "pdf",
						url: "https://example.test/good.pdf",
						sourceName: "GoodAdapter",
						filename: "good.pdf",
						type: "exam",
					},
				];
			},
		};
		const faultyAdapter = {
			name: "FaultyAdapter",
			sourceName: "FaultyAdapter",
			async fetchByStandard() {
				await new Promise((resolve) => setTimeout(resolve, 10));
				throw new Error("transient network failure");
			},
		};

		aggregator.adapters = [goodAdapter, faultyAdapter];
		aggregator.adapterMetaByName = new Map([
			[goodAdapter.sourceName, { displayName: "Good Adapter" }],
			[faultyAdapter.sourceName, { displayName: "Faulty Adapter" }],
		]);
		const manifestService = new ManifestService();
		vi.spyOn(manifestService, "load").mockReturnValue({
			generated: new Date().toISOString(),
			ttl_hours: 72,
			entries: {},
		});
		vi.spyOn(manifestService, "isStale").mockReturnValue(false);
		vi.spyOn(manifestService, "getByStandardId").mockReturnValue([]);
		vi.spyOn(manifestService, "upsertPapers").mockImplementation(() => {});
		vi.spyOn(manifestService, "ensureFile").mockImplementation(() => {});
		aggregator.manifestService = manifestService;
		aggregator.progressCallback = (event: ProgressEvent) => progressEvents.push(event);

		const results = await aggregator.searchExactByStandardId("91606", {
			refresh: true,
		});

		expect(results).toHaveLength(1);
		expect(results[0].sourceName).toBe("GoodAdapter");
		expect(progressEvents.some((event) => event.error)).toBe(true);
		expect(progressEvents.some((event) => event.adapter === "Faulty Adapter")).toBe(true);
	});
});