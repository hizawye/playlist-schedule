import { describe, expect, it } from "vitest";

import { buildClientMigrationKey } from "@/lib/storage-migration";
import { PlaylistState } from "@/lib/types";

function makeState(playlistId: string): PlaylistState {
  return {
    snapshot: {
      playlistId,
      title: `Playlist ${playlistId}`,
      channelTitle: "Channel",
      fetchedAt: "2026-02-15T00:00:00.000Z",
      videos: [
        {
          videoId: `${playlistId}-video-1`,
          title: "Video 1",
          durationSec: 120,
          thumbnailUrl: "",
          position: 0,
        },
      ],
      totalDurationSec: 120,
      videoCount: 1,
    },
    planConfig: {
      minutesPerDay: 45,
      startDate: "2026-02-15",
      playbackSpeed: 1,
    },
    progressMap: {
      [`${playlistId}-video-1`]: {
        completed: true,
        completedAt: "2026-02-15T01:00:00.000Z",
      },
    },
    updatedAt: "2026-02-15T02:00:00.000Z",
  };
}

describe("buildClientMigrationKey", () => {
  it("is deterministic for equivalent state objects", () => {
    const statesA = {
      b: makeState("PL_B"),
      a: makeState("PL_A"),
    };

    const statesB = {
      a: makeState("PL_A"),
      b: makeState("PL_B"),
    };

    expect(buildClientMigrationKey(statesA)).toBe(buildClientMigrationKey(statesB));
  });

  it("changes when progress changes", () => {
    const base = {
      a: makeState("PL_A"),
    };

    const modified = {
      a: {
        ...makeState("PL_A"),
        progressMap: {
          "PL_A-video-1": {
            completed: false,
          },
        },
      },
    };

    expect(buildClientMigrationKey(base)).not.toBe(buildClientMigrationKey(modified));
  });
});
