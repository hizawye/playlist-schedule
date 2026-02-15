import { describe, expect, it } from "vitest";

import {
  migrationPayloadSchema,
  updatePlaylistConfigSchema,
} from "@/lib/server/playlists-contract";

describe("playlists-contract", () => {
  it("rejects empty config updates", () => {
    const result = updatePlaylistConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts valid migration payload", () => {
    const payload = {
      clientMigrationKey: "ps-v1-demo",
      playlists: [
        {
          snapshot: {
            playlistId: "PL1234567890",
            title: "Demo Playlist",
            channelTitle: "Demo Channel",
            fetchedAt: "2026-02-15T00:00:00.000Z",
            videos: [
              {
                videoId: "video1",
                title: "Video 1",
                durationSec: 300,
                thumbnailUrl: "",
                position: 0,
              },
            ],
            totalDurationSec: 300,
            videoCount: 1,
          },
          planConfig: {
            minutesPerDay: 30,
            startDate: "2026-02-15",
            playbackSpeed: 1,
          },
          progressMap: {
            video1: {
              completed: true,
              completedAt: "2026-02-15T01:00:00.000Z",
            },
          },
          updatedAt: "2026-02-15T02:00:00.000Z",
        },
      ],
    };

    const result = migrationPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
