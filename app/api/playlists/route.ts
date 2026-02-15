import { NextResponse } from "next/server";

import { getAuthUserId } from "@/lib/auth";
import { listPlaylistStatesForUser } from "@/lib/server/playlists-repository";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const playlists = await listPlaylistStatesForUser(userId);
  return NextResponse.json({ playlists });
}
