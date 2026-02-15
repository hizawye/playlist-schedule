import { NextResponse } from "next/server";

import { getAuthUserId } from "@/lib/auth";
import { importPlaylistRequestSchema } from "@/lib/server/playlists-contract";
import { createPlaylistForUser } from "@/lib/server/playlists-repository";
import {
  fetchPlaylistSnapshotWithYtDlpDetailed,
  PlaylistUnavailableError,
  YtDlpExecutionError,
  YtDlpNotFoundError,
} from "@/lib/yt-dlp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = importPlaylistRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const extraction = await fetchPlaylistSnapshotWithYtDlpDetailed(
      parsed.data.playlistId
    );

    const created = await createPlaylistForUser({
      userId,
      snapshot: extraction.snapshot,
      planConfig: parsed.data.planConfig,
    });

    if (!created) {
      return NextResponse.json(
        { error: "Playlist already tracked for this account." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      playlist: created,
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
