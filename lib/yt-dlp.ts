import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PlaylistSnapshot } from "@/lib/types";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_FALLBACK_TIMEOUT_MS = 90_000;
const DEFAULT_MAX_BUFFER_BYTES = 25 * 1024 * 1024;
const DEFAULT_MIN_DURATION_COVERAGE_PCT = 80;

interface YtDlpThumbnail {
  url?: string;
}

interface YtDlpVideoEntry {
  id?: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  thumbnails?: YtDlpThumbnail[];
  upload_date?: string;
}

interface YtDlpPlaylistDump {
  title?: string;
  channel?: string;
  uploader?: string;
  entries?: Array<YtDlpVideoEntry | null>;
}

type ExtractionMode = "flat" | "full";

interface YtDlpRunResult {
  dump: YtDlpPlaylistDump;
  elapsedMs: number;
}

export interface YtDlpExtractionMetadata {
  mode: ExtractionMode;
  elapsedMs: number;
  durationCoveragePct: number;
  videoCount: number;
  fallbackAttempted: boolean;
  degraded: boolean;
}

export interface YtDlpDetailedResult {
  snapshot: PlaylistSnapshot;
  metadata: YtDlpExtractionMetadata;
}

export class YtDlpNotFoundError extends Error {}

export class PlaylistUnavailableError extends Error {}

export class YtDlpExecutionError extends Error {}

function getEnvInt(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function getEnvPercent(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.floor(value)));
}

function playlistUrlFromId(playlistId: string): string {
  return `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
}

function parseUploadDate(uploadDate?: string): string | undefined {
  if (!uploadDate || !/^\d{8}$/.test(uploadDate)) {
    return undefined;
  }
  const year = uploadDate.slice(0, 4);
  const month = uploadDate.slice(4, 6);
  const day = uploadDate.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function pickThumbnail(entry: YtDlpVideoEntry): string {
  if (entry.thumbnail) {
    return entry.thumbnail;
  }
  if (entry.thumbnails?.length) {
    const best = entry.thumbnails[entry.thumbnails.length - 1];
    if (best?.url) {
      return best.url;
    }
  }
  return "";
}

function shouldTreatAsUnavailable(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("does not exist") ||
    lowered.includes("private") ||
    lowered.includes("unavailable") ||
    lowered.includes("not available") ||
    lowered.includes("this playlist does not")
  );
}

function isSpawnError(
  error: unknown
): error is {
  code?: string;
  signal?: string;
  stderr?: string;
  message?: string;
} {
  return typeof error === "object" && error !== null;
}

function buildArgs(
  mode: ExtractionMode,
  url: string,
  cookiesFile?: string
): string[] {
  const args = [
    "--dump-single-json",
    "--skip-download",
    "--ignore-errors",
    "--no-warnings",
    "--no-progress",
    "--yes-playlist",
  ];

  if (mode === "flat") {
    args.push("--flat-playlist");
  }

  if (cookiesFile) {
    args.push("--cookies", cookiesFile);
  }

  args.push(url);
  return args;
}

function throwMappedExecutionError(
  error: unknown,
  binary: string,
  timeoutMs: number
): never {
  if (error instanceof PlaylistUnavailableError) {
    throw error;
  }
  if (error instanceof YtDlpNotFoundError) {
    throw error;
  }
  if (error instanceof YtDlpExecutionError) {
    throw error;
  }
  if (error instanceof SyntaxError) {
    throw new YtDlpExecutionError("yt-dlp returned invalid JSON output.");
  }
  if (!isSpawnError(error)) {
    throw new YtDlpExecutionError("Unknown yt-dlp failure.");
  }

  if (error.code === "ENOENT") {
    throw new YtDlpNotFoundError(
      `yt-dlp binary not found at "${binary}". Install yt-dlp or set YTDLP_PATH.`
    );
  }

  const details = [error.message, error.stderr].filter(Boolean).join(" ").trim();
  if (shouldTreatAsUnavailable(details)) {
    throw new PlaylistUnavailableError(details);
  }

  const timedOut =
    error.signal === "SIGTERM" ||
    details.toLowerCase().includes("timed out") ||
    details.toLowerCase().includes("etimedout");

  if (timedOut) {
    throw new YtDlpExecutionError(
      `yt-dlp timed out after ${timeoutMs}ms.`
    );
  }

  throw new YtDlpExecutionError(
    details || "yt-dlp failed while extracting playlist metadata."
  );
}

async function runYtDlp(
  playlistId: string,
  mode: ExtractionMode,
  binary: string,
  timeoutMs: number,
  maxBuffer: number,
  cookiesFile?: string
): Promise<YtDlpRunResult> {
  const url = playlistUrlFromId(playlistId);
  const args = buildArgs(mode, url, cookiesFile);
  const startedAt = Date.now();

  try {
    const { stdout, stderr } = await execFileAsync(binary, args, {
      timeout: timeoutMs,
      maxBuffer,
      windowsHide: true,
    });

    const output = stdout.trim();
    if (!output) {
      const message = stderr?.trim() || "yt-dlp returned an empty response.";
      if (shouldTreatAsUnavailable(message)) {
        throw new PlaylistUnavailableError(message);
      }
      throw new YtDlpExecutionError(message);
    }

    const dump = JSON.parse(output) as YtDlpPlaylistDump;
    return {
      dump,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    throwMappedExecutionError(error, binary, timeoutMs);
  }
}

export function mapYtDlpDumpToSnapshot(
  playlistId: string,
  dump: YtDlpPlaylistDump
): PlaylistSnapshot {
  const entries = dump.entries ?? [];
  const videos = entries
    .filter((entry): entry is YtDlpVideoEntry => Boolean(entry))
    .map((entry, index) => {
      const videoId = entry.id ?? "";
      if (!videoId) {
        return null;
      }
      return {
        videoId,
        title: entry.title?.trim() || `Video ${index + 1}`,
        durationSec:
          typeof entry.duration === "number" && Number.isFinite(entry.duration)
            ? Math.max(0, Math.floor(entry.duration))
            : 0,
        thumbnailUrl: pickThumbnail(entry),
        position: index,
        publishedAt: parseUploadDate(entry.upload_date),
      };
    })
    .filter((video): video is NonNullable<typeof video> => Boolean(video));

  if (videos.length === 0) {
    throw new PlaylistUnavailableError(
      "Playlist is unavailable, empty, or has no accessible videos."
    );
  }

  const totalDurationSec = videos.reduce((sum, video) => sum + video.durationSec, 0);

  return {
    playlistId,
    title: dump.title?.trim() || playlistId,
    channelTitle: dump.channel?.trim() || dump.uploader?.trim() || "Unknown Channel",
    fetchedAt: new Date().toISOString(),
    videos,
    totalDurationSec,
    videoCount: videos.length,
  };
}

export function getDurationCoveragePct(snapshot: PlaylistSnapshot): number {
  if (snapshot.videoCount === 0) {
    return 0;
  }
  const withDuration = snapshot.videos.filter((video) => video.durationSec > 0).length;
  return (withDuration / snapshot.videoCount) * 100;
}

export function shouldFallbackToFullExtraction(
  durationCoveragePct: number,
  minCoveragePct: number
): boolean {
  return durationCoveragePct < minCoveragePct;
}

export async function fetchPlaylistSnapshotWithYtDlpDetailed(
  playlistId: string
): Promise<YtDlpDetailedResult> {
  const binary = process.env.YTDLP_PATH || "yt-dlp";
  const timeoutMs = getEnvInt("YTDLP_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const fallbackTimeoutMs = getEnvInt(
    "YTDLP_FALLBACK_TIMEOUT_MS",
    Math.max(DEFAULT_FALLBACK_TIMEOUT_MS, timeoutMs * 2)
  );
  const maxBuffer = getEnvInt("YTDLP_MAX_BUFFER_BYTES", DEFAULT_MAX_BUFFER_BYTES);
  const minCoveragePct = getEnvPercent(
    "YTDLP_MIN_DURATION_COVERAGE_PCT",
    DEFAULT_MIN_DURATION_COVERAGE_PCT
  );
  const cookiesFile = process.env.YTDLP_COOKIES_FILE;

  const startedAt = Date.now();
  let flatSnapshot: PlaylistSnapshot | null = null;
  let flatCoveragePct = 0;
  let fallbackAttempted = false;

  try {
    const flatResult = await runYtDlp(
      playlistId,
      "flat",
      binary,
      timeoutMs,
      maxBuffer,
      cookiesFile
    );
    flatSnapshot = mapYtDlpDumpToSnapshot(playlistId, flatResult.dump);
    flatCoveragePct = getDurationCoveragePct(flatSnapshot);

    if (!shouldFallbackToFullExtraction(flatCoveragePct, minCoveragePct)) {
      return {
        snapshot: flatSnapshot,
        metadata: {
          mode: "flat",
          elapsedMs: Date.now() - startedAt,
          durationCoveragePct: flatCoveragePct,
          videoCount: flatSnapshot.videoCount,
          fallbackAttempted: false,
          degraded: false,
        },
      };
    }

    fallbackAttempted = true;
  } catch (error) {
    if (error instanceof YtDlpNotFoundError) {
      throw error;
    }
    fallbackAttempted = true;
  }

  try {
    const fullResult = await runYtDlp(
      playlistId,
      "full",
      binary,
      fallbackTimeoutMs,
      maxBuffer,
      cookiesFile
    );
    const fullSnapshot = mapYtDlpDumpToSnapshot(playlistId, fullResult.dump);
    const fullCoveragePct = getDurationCoveragePct(fullSnapshot);

    return {
      snapshot: fullSnapshot,
      metadata: {
        mode: "full",
        elapsedMs: Date.now() - startedAt,
        durationCoveragePct: fullCoveragePct,
        videoCount: fullSnapshot.videoCount,
        fallbackAttempted,
        degraded: false,
      },
    };
  } catch (error) {
    if (flatSnapshot) {
      return {
        snapshot: flatSnapshot,
        metadata: {
          mode: "flat",
          elapsedMs: Date.now() - startedAt,
          durationCoveragePct: flatCoveragePct,
          videoCount: flatSnapshot.videoCount,
          fallbackAttempted: true,
          degraded: true,
        },
      };
    }
    throw error;
  }
}

export async function fetchPlaylistSnapshotWithYtDlp(
  playlistId: string
): Promise<PlaylistSnapshot> {
  const result = await fetchPlaylistSnapshotWithYtDlpDetailed(playlistId);
  return result.snapshot;
}

