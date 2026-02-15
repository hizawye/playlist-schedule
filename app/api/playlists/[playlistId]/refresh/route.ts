import { NextResponse } from "next/server";

import { getAuthUserId } from "@/lib/auth";
import {
  getPlaylistStateForUser,
  refreshPlaylistForUser,
} from "@/lib/server/playlists-repository";
import {
  fetchPlaylistSnapshotWithYtDlpDetailed,
  PlaylistUnavailableError,
  YtDlpExecutionError,
  YtDlpNotFoundError,
} from "@/lib/yt-dlp";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ playlistId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { playlistId } = await context.params;
  const current = await getPlaylistStateForUser(userId, playlistId);

  if (!current) {
    return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  }

  try {
    const extraction = await fetchPlaylistSnapshotWithYtDlpDetailed(playlistId);

    const refreshed = await refreshPlaylistForUser({
      userId,
      snapshot: extraction.snapshot,
      planConfig: current.planConfig,
    });

    if (!refreshed) {
      return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    }

    return NextResponse.json({
      playlist: refreshed,
      extractionMetadata: extraction.metadata,
    });
  } catch (error) {
    if (error instanceof PlaylistUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof YtDlpNotFoundError || error instanceof YtDlpExecutionError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
