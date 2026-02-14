import { PlaylistState } from "@/lib/types";

const STORAGE_VERSION = 1;
const STORAGE_KEY = `ps.v${STORAGE_VERSION}.states`;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizePlaylistState(state: PlaylistState): PlaylistState {
  const planConfig = state.planConfig ?? {
    minutesPerDay: 45,
    startDate: new Date().toISOString().slice(0, 10),
    playbackSpeed: 1 as const,
  };

  return {
    ...state,
    planConfig: {
      ...planConfig,
      playbackSpeed: planConfig.playbackSpeed ?? 1,
    },
  };
}

export function loadPlaylistStates(): Record<string, PlaylistState> {
  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, PlaylistState>;
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    const normalized: Record<string, PlaylistState> = {};
    for (const [playlistId, state] of Object.entries(parsed)) {
      if (!state || typeof state !== "object") {
        continue;
      }
      normalized[playlistId] = normalizePlaylistState(state);
    }
    return normalized;
  } catch {
    return {};
  }
}

export function savePlaylistStates(states: Record<string, PlaylistState>): void {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

export const playlistStorageMeta = {
  version: STORAGE_VERSION,
  key: STORAGE_KEY,
};
