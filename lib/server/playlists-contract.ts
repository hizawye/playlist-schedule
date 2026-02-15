import { z } from "zod";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const playbackSpeedSchema = z.union([
  z.literal(1),
  z.literal(1.5),
  z.literal(1.75),
  z.literal(2),
]);

export const planConfigSchema = z.object({
  minutesPerDay: z.number().int().min(1).max(600),
  startDate: z.string().regex(dateOnlyPattern),
  playbackSpeed: playbackSpeedSchema,
});

export const videoProgressSchema = z.object({
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
});

export const youtubeVideoSchema = z.object({
  videoId: z.string().min(1),
  title: z.string().min(1),
  durationSec: z.number().int().min(0),
  thumbnailUrl: z.string(),
  position: z.number().int().min(0),
  publishedAt: z.string().optional(),
});

export const playlistSnapshotSchema = z.object({
  playlistId: z.string().min(10).max(60),
  title: z.string().min(1),
  channelTitle: z.string().min(1),
  fetchedAt: z.string().datetime(),
  videos: z.array(youtubeVideoSchema),
  totalDurationSec: z.number().int().min(0),
  videoCount: z.number().int().min(0),
});

export const playlistStateSchema = z.object({
  snapshot: playlistSnapshotSchema,
  planConfig: planConfigSchema,
  progressMap: z.record(z.string(), videoProgressSchema),
  updatedAt: z.string().datetime(),
});

export const importPlaylistRequestSchema = z.object({
  playlistId: z.string().min(10).max(60),
  planConfig: planConfigSchema,
});

export const updatePlaylistConfigSchema = planConfigSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one planConfig field is required.",
  }
);

export const updateProgressSchema = z.object({
  videoId: z.string().min(1),
  completed: z.boolean(),
});

export const migrationPayloadSchema = z.object({
  clientMigrationKey: z.string().min(1).max(256),
  playlists: z.array(playlistStateSchema),
});
