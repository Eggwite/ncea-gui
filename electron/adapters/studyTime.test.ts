/* @vitest-environment node */

import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudyTimeAdapter } from "./studyTime.js";
import { CacheService } from "../core/cache.js";

beforeEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe("StudyTimeAdapter", () => {
	it("retries an empty crawl and only caches non-empty results", async () => {
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

	it("writes results progressively while crawling subject pages", async () => {
		const cache = new Map();
		const setSpy = vi.spyOn(CacheService, "set").mockImplementation((key, payload) => {
			cache.set(key, payload);
		});
		vi.spyOn(CacheService, "get").mockImplementation((key) => {
			return cache.has(key) ? cache.get(key) : null;
		});
		vi.spyOn(axios, "get").mockImplementation(async (url: string) => {
			if (url === "https://studytime.co.nz/exams/") {
				return {
					data: `
						<a href="/exams/level-1/mathematics/">Mathematics</a>
						<a href="/exams/level-1/english/">English</a>
					`,
				};
			}

			if (url.includes("/mathematics/")) {
				return {
					data: `
						<h3>91603 Algebra</h3>
						<a href="/files/91603-2024-exam.pdf">2024 exam</a>
					`,
				};
			}

			if (url.includes("/english/")) {
				return {
					data: `
						<h3>91606 Writing</h3>
						<a href="/files/91606-2024-exam.pdf">2024 exam</a>
					`,
				};
			}

			throw new Error(`Unexpected URL: ${url}`);
		});

		const adapter = new StudyTimeAdapter();
		const result = await adapter.fetchByStandard("91603");

		expect(result).toHaveLength(1);
		expect(result[0]?.standardId).toBe("91603");
		expect(setSpy).toHaveBeenCalledTimes(3);
		expect(cache.get("studytime_index")).toHaveLength(2);
	});
});