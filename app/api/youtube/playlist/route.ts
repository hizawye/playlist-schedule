import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthUserId } from "@/lib/auth";
import {
  fetchPlaylistSnapshotWithYtDlpDetailed,
  PlaylistUnavailableError,
  YtDlpExecutionError,
  YtDlpNotFoundError,
} from "@/lib/yt-dlp";

export const runtime = "nodejs";

const querySchema = z.object({
  playlistId: z.string().min(10).max(60),
});

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const parsed = querySchema.safeParse({
      playlistId: request.nextUrl.searchParams.get("playlistId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid playlistId query parameter." },
        { status: 400 }
      );
    }

    const result = await fetchPlaylistSnapshotWithYtDlpDetailed(parsed.data.playlistId);
    console.info(
      "[yt-dlp] playlist extraction success",
      JSON.stringify({
        playlistId: parsed.data.playlistId,
        mode: result.metadata.mode,
        elapsedMs: result.metadata.elapsedMs,
        fallbackAttempted: result.metadata.fallbackAttempted,
        degraded: result.metadata.degraded,
        durationCoveragePct: Number(result.metadata.durationCoveragePct.toFixed(1)),
        videoCount: result.metadata.videoCount,
        totalMs: Date.now() - startedAt,
      })
    );
    const snapshot = result.snapshot;
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error(
      "[yt-dlp] playlist extraction failed",
      JSON.stringify({
        playlistId: request.nextUrl.searchParams.get("playlistId"),
        totalMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      })
    );

    if (error instanceof PlaylistUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof YtDlpNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof YtDlpExecutionError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
