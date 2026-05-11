import axios from "axios";
import { createRequire } from "node:module";
import { PaperSourceAdapter } from "./index.js";
import { CacheService } from "../core/cache.js";
import { INDEX_CACHE_TTL_MS, PaperType } from "../core/constants.js";
import { normaliseStandardId } from "../core/models.js";
import { extractYear } from "../utils/index.js";

const require = createRequire(import.meta.url);
let cheerioModulePromise;

async function getCheerio() {
  cheerioModulePromise ??= Promise.resolve(require("cheerio"));
  return await cheerioModulePromise;
}

const CACHE_KEY = "nobrain_index";
const HTTP_TIMEOUT_MS = 15000;

export function detectNoBrainPaperType(url) {
  let fileName = String(url || "").toLowerCase();
  try {
    fileName = new URL(fileName).pathname.split("/").pop() || fileName;
  } catch {
    fileName = fileName.split("/").pop() || fileName;
  }

  const normalisedFileName = fileName.replace(/[^a-z0-9]+/g, " ");

  // The site uses loose filename conventions, so match the clearest keywords first.
  if (/\b(?:exm|exam|examination)\b/.test(normalisedFileName)) {
    return PaperType.EXAM;
  }

  if (/\b(?:ans|ass|answer|schedule)\b/.test(normalisedFileName)) {
    return PaperType.SCHEDULE;
  }

  if (/\bpep\b/.test(normalisedFileName)) {
    return PaperType.PEP;
  }

  if (/\b(?:help|res|resource)\b/.test(normalisedFileName)) {
    return PaperType.RESOURCE;
  }

  return PaperType.EXAM;
}

export class NoBrainTooSmallAdapter extends PaperSourceAdapter {
  static displayName = "NoBrainTooSmall Website";

  async buildIndex() {
    return [];
  }

  async fetchByStandard(standardId) {
    const id = normaliseStandardId(standardId);
    if (!id) return [];

    const cached = CacheService.get(CACHE_KEY, INDEX_CACHE_TTL_MS);
    const hasRequestedStandard =
      Array.isArray(cached) &&
      cached.some((paper) => normaliseStandardId(paper.standardId) === id);
    const index = hasRequestedStandard ? cached : await this._crawlAll();

    if (Array.isArray(index) && index.length > 0) {
      CacheService.set(CACHE_KEY, index);
    }

    return index
      .filter((paper) => normaliseStandardId(paper.standardId) === id)
      .map((paper) => this.normalisePaper(paper))
      .filter(Boolean);
  }

  async _crawlAll() {
    const papers = [];
    try {
      const hubs = [
        "https://www.nobraintoosmall.co.nz/NCEA/sci1/sci1.htm",
        "https://www.nobraintoosmall.co.nz/NCEA/phy1/phy1.htm",
        "https://www.nobraintoosmall.co.nz/NCEA/phy2/phy2.htm",
        "https://www.nobraintoosmall.co.nz/NCEA/phy3/phy3.htm",
        "https://www.nobraintoosmall.co.nz/NCEA/che1/che1.htm",
        "https://www.nobraintoosmall.co.nz/NCEA/che2/che2.htm",
        "https://www.nobraintoosmall.co.nz/NCEA/che3/che3.htm",
        "https://www.nobraintoosmall.co.nz/NCEA/bio1/bio1.htm",
        "https://www.nobraintoosmall.co.nz/NCEA/bio2/bio2.htm",
        "https://www.nobraintoosmall.co.nz/NCEA/bio3/bio3.htm",
      ];

      const fetchHub = async (hubUrl) => {
        try {
          const { data } = await axios.get(hubUrl, {
            timeout: HTTP_TIMEOUT_MS,
          });
          const cheerio = await getCheerio();
          const $ = cheerio.load(data);

          $("tr").each((_, row) => {
            const $row = $(row);
            const links = $row.find("a");
            if (links.length === 0) return;

            const standardCell = $row.find("td").first();
            const standardLink = standardCell.find("a").first();
            const standardLinkText = standardLink.text().trim();
            const standardLinkHref = standardLink.attr("href") || "";
            const standardMatch =
              standardLinkText.match(/(?:^|\b|AS\s*)(9\d{4})(?:\b|$)/i) ||
              standardLinkHref.match(
                /(?:^|\/|-|_|as\s*)(9\d{4})(?:\.|\b|-|_)/i,
              ) ||
              standardCell.text().match(/(?:^|\b)(9\d{4})(?:\b|$)/i);

            const currentStandardId = standardMatch?.[1] || null;

            if (!currentStandardId) return;

            const titleText =
              $row.find("td").eq(1).find("p").first().text().trim() ||
              $row
                .find("td")
                .eq(1)
                .clone()
                .find("a")
                .remove()
                .end()
                .text()
                .replace(/\s+/g, " ")
                .trim();

            links.each((__, el) => {
              const $el = $(el);
              const href = $el.attr("href");
              if (!href || !href.toLowerCase().endsWith(".pdf")) return;

              let cleanUrl = href;
              if (cleanUrl.includes("#")) {
                cleanUrl = cleanUrl.split("#")[0];
              }

              // Determine type
              const type = detectNoBrainPaperType(cleanUrl);

              // Extract year if possible
              let year = extractYear(cleanUrl);
              if (!year) {
                const shortYearMatch = cleanUrl.match(/-(\d{2})(?:-|\.pdf)/i);
                if (shortYearMatch) {
                  const y = Number(shortYearMatch[1]);
                  if (y >= 2 && y <= 99) year = 2000 + y;
                }
              }

              // Resolve absolute URL
              const absoluteUrl = new URL(cleanUrl, hubUrl).toString();

              papers.push({
                standardId: currentStandardId,
                subject: hubUrl.includes("phy")
                  ? "Physics"
                  : hubUrl.includes("che")
                    ? "Chemistry"
                    : hubUrl.includes("bio")
                      ? "Biology"
                      : "Science",
                title:
                  titleText.length > 5
                    ? titleText
                    : `Standard ${currentStandardId}`,
                level:
                  Number(hubUrl.match(/(?:phy|che|bio|sci)(\d)/i)?.[1]) || 0,
                year,
                format: "pdf",
                url: absoluteUrl,
                sourceName: this.name,
                filename: `${currentStandardId}_${year || "unknown"}_${type}.pdf`,
                type,
              });
            });
          });
        } catch (e) {
          // ignore
        }
      };

      await Promise.all(hubs.map(fetchHub));
      return papers;
    } catch (err) {
      console.error(`Failed to build NoBrainTooSmall index: ${err.message}`);
      return [];
    }
  }
}
