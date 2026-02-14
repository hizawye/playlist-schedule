import PlaylistDetailClient from "@/app/playlist/[playlistId]/playlist-detail-client";

interface PlaylistDetailPageProps {
  params: Promise<{ playlistId: string }>;
}

export default async function PlaylistDetailPage({ params }: PlaylistDetailPageProps) {
  const resolvedParams = await params;
  return <PlaylistDetailClient playlistId={resolvedParams.playlistId} />;
}

