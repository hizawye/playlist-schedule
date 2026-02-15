import { NextResponse } from "next/server";

import { getAuthUserId } from "@/lib/auth";
import { updateProgressSchema } from "@/lib/server/playlists-contract";
import { setVideoCompletionForUser } from "@/lib/server/playlists-repository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ playlistId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = updateProgressSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { playlistId } = await context.params;
  const playlist = await setVideoCompletionForUser(
    userId,
    playlistId,
    parsed.data.videoId,
    parsed.data.completed
  );

  if (!playlist) {
    return NextResponse.json(
      { error: "Playlist or video not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ playlist });
}
