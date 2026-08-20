import type { ResultKey } from "./diagnosis";

const segmentCodeMap: Record<string, Record<ResultKey, string>> = {
  "子どもと": {
    coloring: "KJ-2652ZK",
    meal: "KJ-2YQS2T",
    sweet: "KJ-397BKF",
  },
  "家族と": {
    coloring: "KJ-4E764R",
    meal: "KJ-7FUY5M",
    sweet: "KJ-7QXMCX",
  },
  "友人と": {
    coloring: "KJ-EAW27M",
    meal: "KJ-QA28PD",
    sweet: "KJ-QEXLHA",
  },
  "ひとりで": {
    coloring: "KJ-UTRNN7",
    meal: "KJ-XBP7D3",
    sweet: "KJ-ZWUK77",
  },
};

const fallbackCode = "KJ-B9PQ2K";

export const buildLstepSegmentKeyword = (result: ResultKey, companion?: string) =>
  (companion ? segmentCodeMap[companion]?.[result] : undefined) || fallbackCode;

export const buildLstepSegmentUrl = (
  result: ResultKey,
  companion?: string,
  officialAccountId = "@958ctvuh",
) => {
  const keyword = buildLstepSegmentKeyword(result, companion);
  return `https://line.me/R/oaMessage/${encodeURIComponent(officialAccountId)}/?${encodeURIComponent(keyword)}`;
};
