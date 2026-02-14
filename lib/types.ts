export type PlaybackSpeed = 1 | 1.5 | 1.75 | 2;

export interface YouTubeVideo {
  videoId: string;
  title: string;
  durationSec: number;
  thumbnailUrl: string;
  position: number;
  publishedAt?: string;
}

export interface PlaylistSnapshot {
  playlistId: string;
  title: string;
  channelTitle: string;
  fetchedAt: string;
  videos: YouTubeVideo[];
  totalDurationSec: number;
  videoCount: number;
}

export interface PlanConfig {
  minutesPerDay: number;
  startDate: string;
  playbackSpeed: PlaybackSpeed;
}

export interface VideoProgress {
  completed: boolean;
  completedAt?: string;
}

export interface PlaylistState {
  snapshot: PlaylistSnapshot;
  planConfig: PlanConfig;
  progressMap: Record<string, VideoProgress>;
  updatedAt: string;
}

export interface ScheduledDay {
  date: string;
  videoIds: string[];
  plannedDurationSec: number;
}

export interface ScheduleResult {
  days: ScheduledDay[];
  videoDayMap: Record<string, string>;
  endDate: string | null;
  totalDurationSec: number;
  remainingDurationSec: number;
  totalAdjustedDurationSec: number;
  remainingAdjustedDurationSec: number;
  dailyAdjustedBudgetSec: number;
  totalVideos: number;
  remainingVideos: number;
  completedVideos: number;
  completionRate: number;
}
