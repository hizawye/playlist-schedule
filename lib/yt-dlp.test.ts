import { describe, expect, it } from "vitest";

import {
  getDurationCoveragePct,
  mapYtDlpDumpToSnapshot,
  PlaylistUnavailableError,
  shouldFallbackToFullExtraction,
} from "@/lib/yt-dlp";

describe("mapYtDlpDumpToSnapshot", () => {
  it("maps yt-dlp playlist JSON into app snapshot", () => {
    const snapshot = mapYtDlpDumpToSnapshot("PL1234567890abcdef", {
      title: "Demo Playlist",
      channel: "Demo Channel",
      entries: [
        {
          id: "vid1",
          title: "Video 1",
          duration: 120,
          thumbnail: "https://img.example/1.jpg",
          upload_date: "20260210",
        },
        {
          id: "vid2",
          title: "Video 2",
          duration: 240,
          thumbnails: [{ url: "https://img.example/2-small.jpg" }, { url: "https://img.example/2.jpg" }],
        },
      ],
    });

    expect(snapshot.playlistId).toBe("PL1234567890abcdef");
    expect(snapshot.title).toBe("Demo Playlist");
    expect(snapshot.channelTitle).toBe("Demo Channel");
    expect(snapshot.videoCount).toBe(2);
    expect(snapshot.totalDurationSec).toBe(360);
    expect(snapshot.videos[0].publishedAt).toBe("2026-02-10");
    expect(snapshot.videos[1].thumbnailUrl).toBe("https://img.example/2.jpg");
  });

  it("throws unavailable error for empty entries", () => {
    expect(() =>
      mapYtDlpDumpToSnapshot("PL1234567890abcdef", { entries: [] })
    ).toThrow(PlaylistUnavailableError);
  });
});

describe("duration coverage and fallback policy", () => {
  it("computes duration coverage percentage", () => {
    const snapshot = mapYtDlpDumpToSnapshot("PL1234567890abcdef", {
      title: "Coverage Playlist",
      entries: [
        { id: "v1", title: "One", duration: 120 },
        { id: "v2", title: "Two", duration: 0 },
        { id: "v3", title: "Three" },
        { id: "v4", title: "Four", duration: 30 },
      ],
    });

    expect(getDurationCoveragePct(snapshot)).toBe(50);
  });

  it("triggers fallback when coverage is below threshold", () => {
    expect(shouldFallbackToFullExtraction(79.9, 80)).toBe(true);
    expect(shouldFallbackToFullExtraction(80, 80)).toBe(false);
  });
});
