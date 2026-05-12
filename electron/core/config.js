import Conf from "conf";
import { DEFAULT_FAVORITE_SOURCE } from "./constants.js";

const schema = {
  default_download_path: {
    type: "string",
    default: "",
  },
  always_refresh_sources: {
    type: "boolean",
    default: false,
  },
  favorite_source: {
    type: "string",
    default: DEFAULT_FAVORITE_SOURCE,
  },
  downloads_history: {
    type: "array",
    default: [],
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        standardId: { type: "string" },
        fileName: { type: "string" },
        filePath: { type: "string" },
        source: { type: "string" },
        downloadedAt: { type: "number" },
        size: { type: "number" },
        status: { type: "string" },
      },
    },
  },
};

export const config = new Conf({ projectName: "ncea-cli", schema });
