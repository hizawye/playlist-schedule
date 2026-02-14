import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildSchedule } from "@/lib/scheduler";
import { PlanConfig, YouTubeVideo } from "@/lib/types";

const videos: YouTubeVideo[] = [
  {
    videoId: "a",
    title: "Video A",
    durationSec: 600,
    thumbnailUrl: "",
    position: 0,
  },
  {
    videoId: "b",
    title: "Video B",
    durationSec: 900,
    thumbnailUrl: "",
    position: 1,
  },
  {
    videoId: "c",
    title: "Video C",
    durationSec: 1800,
    thumbnailUrl: "",
    position: 2,
  },
];

const config: PlanConfig = {
  minutesPerDay: 30,
  startDate: "2026-02-14",
  playbackSpeed: 1,
};

describe("buildSchedule", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-14T08:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allocates videos into day buckets in sequence", () => {
    const result = buildSchedule(videos, config, {});
    expect(result.days.length).toBe(2);
    expect(result.days[0].videoIds).toEqual(["a", "b"]);
    expect(result.days[1].videoIds).toEqual(["c"]);
    expect(result.endDate).toBe("2026-02-15");
  });

  it("keeps a long video on its own day if it exceeds daily budget", () => {
    const longVideos: YouTubeVideo[] = [
      {
        videoId: "long",
        title: "Long",
        durationSec: 4000,
        thumbnailUrl: "",
        position: 0,
      },
    ];

    const result = buildSchedule(longVideos, config, {});
    expect(result.days.length).toBe(1);
    expect(result.days[0].plannedDurationSec).toBe(4000);
  });

  it("recomputes based on completion state", () => {
    const result = buildSchedule(videos, config, {
      a: { completed: true },
      b: { completed: true },
    });
    expect(result.remainingVideos).toBe(1);
    expect(result.completedVideos).toBe(2);
    expect(result.days.length).toBe(1);
    expect(result.days[0].videoIds).toEqual(["c"]);
  });

  it("reduces remaining watch time based on playback speed", () => {
    const result = buildSchedule(
      videos,
      {
        ...config,
        playbackSpeed: 2,
      },
      {}
    );
    expect(result.remainingAdjustedDurationSec).toBe(1650);
    expect(result.totalAdjustedDurationSec).toBe(1650);
  });

  it("starts remaining schedule from today when start date is in the past", () => {
    const result = buildSchedule(
      videos,
      {
        ...config,
        startDate: "2026-01-01",
      },
      {
        a: { completed: true },
      }
    );
    expect(result.days[0].date).toBe("2026-02-14");
  });
});
