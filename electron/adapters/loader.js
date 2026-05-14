import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import * as _noBrain from "./noBrain.js";
import * as _ourExams from "./ourExams.js";
import * as _quirky from "./quirky.js";
import * as _studyTime from "./studyTime.js";

import { PaperSourceAdapter } from "./index.js";

const BUILTIN_MODULES = [_noBrain, _ourExams, _quirky, _studyTime];
const RESERVED_FILES = new Set(["index.js", "loader.js"]);

function isAdapter(c) {
	return typeof c === "function" && c.prototype instanceof PaperSourceAdapter;
}

function toEntry(AdapterClass) {
	const adapter = new AdapterClass();
	const instanceName = String(adapter.name || "").trim();
	if (!instanceName) {
		throw new Error(
			`Adapter ${AdapterClass.name} must have a non-empty instance name. ` +
				`Either define static sourceName or ensure super() is called in constructor.`
		);
	}
	return {
		adapter,
		sourceName: instanceName,
		displayName: AdapterClass.displayName ?? instanceName ?? AdapterClass.name,
		fileName: "<builtin>",
	};
}

function discoverAdaptersProd() {
	return BUILTIN_MODULES.flatMap((mod) =>
		Object.values(mod).filter(isAdapter).map(toEntry)
	);
}

async function discoverAdaptersDev({
	adaptersDir,
	requireFn,
	fsModule = fs,
} = {}) {
	if (!adaptersDir) {
		adaptersDir = path.dirname(fileURLToPath(import.meta.url));
	}

	const files = fsModule
		.readdirSync(adaptersDir, { withFileTypes: true })
		.filter(
			(e) => e.isFile() && e.name.endsWith(".js") && !RESERVED_FILES.has(e.name)
		)
		.map((e) => e.name)
		.sort((a, b) => a.localeCompare(b));

	const discovered = [];
	for (const fileName of files) {
		const modulePath = path.join(adaptersDir, fileName);
		try {
			const mod = requireFn
				? requireFn(modulePath)
				: await import(pathToFileURL(modulePath).href);

			for (const AdapterClass of Object.values(mod).filter(isAdapter)) {
				try {
					const adapter = new AdapterClass();
					const instanceName = String(adapter.name || "").trim();
					if (!instanceName) {
						console.warn(
							`[AdapterLoader] Skipping ${fileName}: adapter must have a name. ` +
								`Define static sourceName or ensure super() is called.`
						);
						continue;
					}
					discovered.push({
						adapter,
						sourceName: instanceName,
						displayName: AdapterClass.displayName || instanceName,
						fileName,
					});
				} catch (err) {
					console.warn(
						`[AdapterLoader] Failed to load adapter from ${fileName}: ${String(err)}`
					);
					continue;
				}
			}
		} catch {
			continue;
		}
	}

	const seen = new Set();
	return discovered.filter((e) => {
		if (seen.has(e.sourceName)) return false;
		seen.add(e.sourceName);
		return true;
	});
}

export async function discoverAdapters(opts = {}) {
	if (opts.adaptersDir) return discoverAdaptersDev(opts);
	const prod = discoverAdaptersProd();
	if (prod.length > 0) return prod;
	return discoverAdaptersDev(opts);
}
