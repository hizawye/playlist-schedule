import { describe, expect, it } from "vitest";

import {
  parsePlaylistId,
  parsePlaylistIdsFromMultiline,
  parseYouTubeDurationToSeconds,
} from "@/lib/youtube";

describe("parseYouTubeDurationToSeconds", () => {
  it("parses basic minute/second durations", () => {
    expect(parseYouTubeDurationToSeconds("PT1M30S")).toBe(90);
  });

  it("parses hour/minute durations", () => {
    expect(parseYouTubeDurationToSeconds("PT2H5M")).toBe(7500);
  });

  it("returns 0 for invalid values", () => {
    expect(parseYouTubeDurationToSeconds("oops")).toBe(0);
  });
});

describe("parsePlaylistId", () => {
  it("extracts playlist id from URL", () => {
    expect(
      parsePlaylistId(
        "https://www.youtube.com/playlist?list=PL1234567890abcdef"
      )
    ).toBe("PL1234567890abcdef");
  });

  it("accepts direct playlist id", () => {
    expect(parsePlaylistId("PL1234567890abcdef")).toBe("PL1234567890abcdef");
  });

  it("returns null for invalid input", () => {
    expect(parsePlaylistId("")).toBeNull();
  });
});

describe("parsePlaylistIdsFromMultiline", () => {
  it("parses one playlist per line from mixed URLs and ids", () => {
    expect(
      parsePlaylistIdsFromMultiline(
        [
          "https://www.youtube.com/playlist?list=PL1234567890abcdef",
          "PL0987654321abcdef",
        ].join("\n")
      )
    ).toEqual(["PL1234567890abcdef", "PL0987654321abcdef"]);
  });

  it("ignores blank and invalid lines", () => {
    expect(
      parsePlaylistIdsFromMultiline(
        ["", "   ", "not a playlist", "PL1234567890abcdef"].join("\n")
      )
    ).toEqual(["PL1234567890abcdef"]);
  });

  it("dedupes playlist ids while preserving first-seen order", () => {
    expect(
      parsePlaylistIdsFromMultiline(
        [
          "PL1234567890abcdef",
          "https://www.youtube.com/playlist?list=PL1234567890abcdef",
          "PL0987654321abcdef",
        ].join("\n")
      )
    ).toEqual(["PL1234567890abcdef", "PL0987654321abcdef"]);
  });
});
