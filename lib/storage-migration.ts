import { PlaylistState } from "@/lib/types";

function stableProgressEntries(progressMap: PlaylistState["progressMap"]) {
  return Object.entries(progressMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([videoId, progress]) => ({
      videoId,
      completed: progress.completed,
      completedAt: progress.completedAt ?? null,
    }));
}

function stablePlaylistState(state: PlaylistState) {
  return {
    snapshot: {
      playlistId: state.snapshot.playlistId,
      title: state.snapshot.title,
      channelTitle: state.snapshot.channelTitle,
      fetchedAt: state.snapshot.fetchedAt,
      totalDurationSec: state.snapshot.totalDurationSec,
      videoCount: state.snapshot.videoCount,
      videos: [...state.snapshot.videos]
        .sort((a, b) => a.position - b.position)
        .map((video) => ({
          videoId: video.videoId,
          title: video.title,
          durationSec: video.durationSec,
          thumbnailUrl: video.thumbnailUrl,
          position: video.position,
          publishedAt: video.publishedAt ?? null,
        })),
    },
    planConfig: {
      minutesPerDay: state.planConfig.minutesPerDay,
      startDate: state.planConfig.startDate,
      playbackSpeed: state.planConfig.playbackSpeed,
    },
    progress: stableProgressEntries(state.progressMap),
    updatedAt: state.updatedAt,
  };
}

function fnv1a64(text: string): string {
  let hash = BigInt("0xcbf29ce484222325");
  const prime = BigInt("0x100000001b3");

  for (let i = 0; i < text.length; i += 1) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * prime);
  }

  return hash.toString(16).padStart(16, "0");
}

export function buildClientMigrationKey(states: Record<string, PlaylistState>): string {
  const ordered = Object.entries(states)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, state]) => stablePlaylistState(state));

  const digest = fnv1a64(JSON.stringify(ordered));
  return `ps-v1-${digest}`;
}
