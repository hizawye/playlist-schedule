import { NextResponse } from "next/server";

import { getAuthUserId } from "@/lib/auth";
import { migrationPayloadSchema } from "@/lib/server/playlists-contract";
import { migrateLocalPlaylistStatesForUser } from "@/lib/server/playlists-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = migrationPayloadSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const summary = await migrateLocalPlaylistStatesForUser({
    userId,
    clientMigrationKey: parsed.data.clientMigrationKey,
    playlistStates: parsed.data.playlists,
  });

  return NextResponse.json(summary);
}
