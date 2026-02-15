import { PlanConfig, PlaylistState } from "@/lib/types";

interface ApiErrorPayload {
  error?: string;
}

interface PlaylistsResponse {
  playlists: PlaylistState[];
}

interface PlaylistResponse {
  playlist: PlaylistState;
}

interface ImportPlaylistResponse extends PlaylistResponse {
  extractionMetadata: {
    mode: "flat" | "full";
    elapsedMs: number;
    durationCoveragePct: number;
    videoCount: number;
    fallbackAttempted: boolean;
    degraded: boolean;
  };
}

export interface MigrationResponse {
  importedPlaylists: number;
  skippedPlaylists: number;
  importedProgressEntries: number;
  alreadyMigrated: boolean;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorPayload
    | null;

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }

    const message = payload && typeof payload === "object" && "error" in payload
      ? payload.error || "Request failed."
      : "Request failed.";
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Expected JSON response payload.");
  }

  return payload as T;
}

export async function fetchPlaylists(): Promise<PlaylistState[]> {
  const response = await fetch("/api/playlists", {
    cache: "no-store",
  });
  const payload = await parseApiResponse<PlaylistsResponse>(response);
  return payload.playlists;
}

export async function fetchPlaylist(playlistId: string): Promise<PlaylistState> {
  const response = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
    cache: "no-store",
  });
  const payload = await parseApiResponse<PlaylistResponse>(response);
  return payload.playlist;
}

export async function importPlaylist(
  playlistId: string,
  planConfig: PlanConfig
): Promise<ImportPlaylistResponse> {
  const response = await fetch("/api/playlists/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      playlistId,
      planConfig,
    }),
  });

  return parseApiResponse<ImportPlaylistResponse>(response);
}

export async function updatePlaylistConfig(
  playlistId: string,
  patch: Partial<PlanConfig>
): Promise<PlaylistState> {
  const response = await fetch(
    `/api/playlists/${encodeURIComponent(playlistId)}/config`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    }
  );

  const payload = await parseApiResponse<PlaylistResponse>(response);
  return payload.playlist;
}

export async function updatePlaylistProgress(
  playlistId: string,
  videoId: string,
  completed: boolean
): Promise<PlaylistState> {
  const response = await fetch(
    `/api/playlists/${encodeURIComponent(playlistId)}/progress`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoId,
        completed,
      }),
    }
  );

  const payload = await parseApiResponse<PlaylistResponse>(response);
  return payload.playlist;
}

export async function refreshPlaylist(playlistId: string): Promise<PlaylistState> {
  const response = await fetch(
    `/api/playlists/${encodeURIComponent(playlistId)}/refresh`,
    {
      method: "POST",
    }
  );

  const payload = await parseApiResponse<PlaylistResponse>(response);
  return payload.playlist;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const response = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
    method: "DELETE",
  });

  if (response.status === 204) {
    return;
  }

  await parseApiResponse<Record<string, never>>(response);
}

export async function migrateLocalState(payload: {
  clientMigrationKey: string;
  playlists: PlaylistState[];
}): Promise<MigrationResponse> {
  const response = await fetch("/api/migration/local-state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<MigrationResponse>(response);
}
