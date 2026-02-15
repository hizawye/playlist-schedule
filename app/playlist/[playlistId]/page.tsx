import { redirect } from "next/navigation";

import PlaylistDetailClient from "@/app/playlist/[playlistId]/playlist-detail-client";
import { getAuthSession } from "@/lib/auth";

interface PlaylistDetailPageProps {
  params: Promise<{ playlistId: string }>;
}

export default async function PlaylistDetailPage({ params }: PlaylistDetailPageProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const resolvedParams = await params;
  return <PlaylistDetailClient playlistId={resolvedParams.playlistId} />;
}
