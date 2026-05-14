import { PaperType } from "../../electron/core/constants.js";

/**
 * Validates that an adapter instance has the required structure and properties.
 * Throws descriptive errors if validation fails.
 *
 * @param {any} adapter - The adapter instance to validate
 * @param {string} adapterName - Name of the adapter (for error messages)
 */
export function validateAdapterStructure(adapter: any, adapterName = "Adapter") {
	if (!adapter) {
		throw new Error(`${adapterName}: adapter instance is null or undefined`);
	}

	if (typeof adapter.name !== "string" || !adapter.name) {
		throw new Error(
			`${adapterName}: adapter.name must be a non-empty string. ` +
				`Got: ${typeof adapter.name} "${adapter.name}". ` +
				`Define static sourceName or ensure super() is called in constructor.`
		);
	}

	if (
		typeof adapter.fetchByStandard !== "function" &&
		typeof adapter.buildIndex !== "function"
	) {
		throw new Error(
			`${adapterName}: must implement at least one of fetchByStandard() or buildIndex()`
		);
	}
}

/**
 * Validates that a paper object matches the required schema.
 * Throws descriptive errors if validation fails.
 *
 * @param {any} paper - The paper object to validate
 * @param {string} adapterName - Name of the adapter (for error messages)
 */
export function validatePaper(paper: any, adapterName = "Adapter") {
	if (!paper || typeof paper !== "object") {
		throw new Error(
			`${adapterName}: paper must be a non-null object. Got: ${typeof paper}`
		);
	}

	const requiredFields = [
		"standardId",
		"subject",
		"title",
		"level",
		"format",
		"url",
		"type",
	];
	const missingFields = requiredFields.filter((field) => !(field in paper));
	if (missingFields.length > 0) {
		throw new Error(
			`${adapterName}: paper missing required fields: ${missingFields.join(", ")}. ` +
				`Got: ${JSON.stringify(paper)}`
		);
	}

	if (typeof paper.standardId !== "string" || !paper.standardId.trim()) {
		throw new Error(
			`${adapterName}: paper.standardId must be a non-empty string. Got: "${paper.standardId}"`
		);
	}

	if (typeof paper.url !== "string" || !paper.url.trim()) {
		throw new Error(
			`${adapterName}: paper.url must be a non-empty string. Got: "${paper.url}"`
		);
	}

	if (!Number.isFinite(paper.level)) {
		throw new Error(
			`${adapterName}: paper.level must be a finite number. Got: ${typeof paper.level} "${paper.level}"`
		);
	}

	if (paper.type === PaperType.BULK_ZIP) {
		if (!Number.isFinite(paper.yearFrom) || !Number.isFinite(paper.yearTo)) {
			throw new Error(
				`${adapterName}: BULK_ZIP paper must have yearFrom and yearTo as finite numbers. ` +
					`Got: yearFrom=${paper.yearFrom}, yearTo=${paper.yearTo}`
			);
		}
		if (paper.yearFrom > paper.yearTo) {
			throw new Error(
				`${adapterName}: BULK_ZIP paper yearFrom must be <= yearTo. ` +
					`Got: yearFrom=${paper.yearFrom}, yearTo=${paper.yearTo}`
			);
		}
	} else {
		if (!Number.isFinite(paper.year)) {
			throw new Error(
				`${adapterName}: single-file paper must have year as a finite number. Got: ${typeof paper.year} "${paper.year}"`
			);
		}
	}
}

/**
 * Validates that a fetchByStandard result is an array of valid papers.
 *
 * @param {any} result - The result from fetchByStandard
 * @param {string} standardId - The standard ID that was requested
 * @param {string} adapterName - Name of the adapter (for error messages)
 */
export function validateFetchByStandardResult(
	result: any,
	standardId: string,
	adapterName = "Adapter"
) {
	if (!Array.isArray(result)) {
		throw new Error(
			`${adapterName}: fetchByStandard(${standardId}) must return an array. ` +
				`Got: ${typeof result}`
		);
	}

	for (const paper of result) {
		validatePaper(paper, `${adapterName}.fetchByStandard(${standardId})`);

		if (paper.standardId !== standardId) {
			throw new Error(
				`${adapterName}.fetchByStandard(${standardId}): ` +
					`paper.standardId must match requested standard. ` +
					`Got: "${paper.standardId}"`
			);
		}
	}
}

/**
 * Validates that a buildIndex result is an array of valid papers.
 *
 * @param {any} result - The result from buildIndex
 * @param {string} adapterName - Name of the adapter (for error messages)
 */
export function validateBuildIndexResult(result: any, adapterName = "Adapter") {
	if (!Array.isArray(result)) {
		throw new Error(
			`${adapterName}: buildIndex() must return an array. Got: ${typeof result}`
		);
	}

	for (const paper of result) {
		validatePaper(paper, `${adapterName}.buildIndex()`);
	}
}
