import { NextResponse } from "next/server";

import { getAuthUserId } from "@/lib/auth";
import {
  deletePlaylistForUser,
  getPlaylistStateForUser,
} from "@/lib/server/playlists-repository";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ playlistId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { playlistId } = await context.params;
  const playlist = await getPlaylistStateForUser(userId, playlistId);

  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  }

  return NextResponse.json({ playlist });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { playlistId } = await context.params;
  const deleted = await deletePlaylistForUser(userId, playlistId);

  if (!deleted) {
    return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
