import type { ResultKey } from "./diagnosis";

export const companionKeywordMap: Record<string, string> = {
  "子どもと": "子ども",
  "家族と": "家族",
  "友人と": "友人",
  "ひとりで": "ひとり",
};

export const resultKeywordMap: Record<ResultKey, string> = {
  coloring: "親子",
  meal: "御膳",
  sweet: "甘味",
};

export const buildLstepSegmentKeyword = (result: ResultKey, companion?: string) => {
  const companionKey = companion ? companionKeywordMap[companion] : "";
  if (!companionKey) return "休日診断_特典獲得";
  return `休日診断_${companionKey}_${resultKeywordMap[result]}`;
};

export const buildLstepSegmentUrl = (
  result: ResultKey,
  companion?: string,
  officialAccountId = "@958ctvuh",
) => {
  const keyword = buildLstepSegmentKeyword(result, companion);
  return `https://line.me/R/oaMessage/${encodeURIComponent(officialAccountId)}/?${encodeURIComponent(keyword)}`;
};
