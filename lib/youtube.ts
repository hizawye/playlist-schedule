const PLAYLIST_ID_PATTERN = /^[a-zA-Z0-9_-]{10,60}$/;

export function parsePlaylistId(input: string): string | null {
  const raw = input.trim();
  if (!raw) {
    return null;
  }

  if (PLAYLIST_ID_PATTERN.test(raw) && !raw.includes("http")) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const list = url.searchParams.get("list");
    if (list && PLAYLIST_ID_PATTERN.test(list)) {
      return list;
    }
  } catch {
    const match = raw.match(/[?&]list=([a-zA-Z0-9_-]{10,60})/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function parsePlaylistIdsFromMultiline(input: string): string[] {
  const seen = new Set<string>();
  const playlistIds: string[] = [];

  for (const line of input.split(/\r?\n/)) {
    const playlistId = parsePlaylistId(line);
    if (!playlistId || seen.has(playlistId)) {
      continue;
    }
    seen.add(playlistId);
    playlistIds.push(playlistId);
  }

  return playlistIds;
}

export function parseYouTubeDurationToSeconds(duration: string): number {
  const match = duration.match(
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
  );
  if (!match) {
    return 0;
  }

  const years = Number(match[1] ?? 0);
  const months = Number(match[2] ?? 0);
  const weeks = Number(match[3] ?? 0);
  const days = Number(match[4] ?? 0);
  const hours = Number(match[5] ?? 0);
  const minutes = Number(match[6] ?? 0);
  const seconds = Number(match[7] ?? 0);

  return (
    years * 31536000 +
    months * 2628000 +
    weeks * 604800 +
    days * 86400 +
    hours * 3600 +
    minutes * 60 +
    seconds
  );
}
