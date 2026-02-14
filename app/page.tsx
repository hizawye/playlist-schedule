"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AddPlaylistForm } from "@/components/add-playlist-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDurationCompact, formatShortDate } from "@/lib/format";
import { buildSchedule } from "@/lib/scheduler";
import {
  loadPlaylistStates,
  playlistStorageMeta,
  savePlaylistStates,
} from "@/lib/storage";
import { PlaybackSpeed, PlaylistSnapshot, PlaylistState } from "@/lib/types";
import { parsePlaylistId, parsePlaylistIdsFromMultiline } from "@/lib/youtube";

async function fetchPlaylistSnapshot(playlistId: string): Promise<PlaylistSnapshot> {
  const response = await fetch(
    `/api/youtube/playlist?playlistId=${encodeURIComponent(playlistId)}`
  );

  const payload = (await response.json()) as PlaylistSnapshot | { error: string };
  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload ? payload.error : "Could not import this playlist."
    );
  }

  return payload;
}

function subscribePlaylistStates(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener("playlist-states-updated", handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("playlist-states-updated", handler);
  };
}

function notifyPlaylistStatesUpdated() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event("playlist-states-updated"));
}

const EMPTY_PLAYLIST_STATES: Record<string, PlaylistState> = {};

let cachedRawPlaylistStates: string | null = null;
let cachedPlaylistStates: Record<string, PlaylistState> = EMPTY_PLAYLIST_STATES;

function getServerPlaylistStatesSnapshot(): Record<string, PlaylistState> {
  return EMPTY_PLAYLIST_STATES;
}

function getClientPlaylistStatesSnapshot(): Record<string, PlaylistState> {
  if (typeof window === "undefined") {
    return EMPTY_PLAYLIST_STATES;
  }

  const raw = window.localStorage.getItem(playlistStorageMeta.key);
  if (raw === cachedRawPlaylistStates) {
    return cachedPlaylistStates;
  }

  cachedRawPlaylistStates = raw;
  cachedPlaylistStates = loadPlaylistStates();
  return cachedPlaylistStates;
}

interface ImportFailure {
  playlistId: string;
  message: string;
}

function formatBatchSummary(
  importedCount: number,
  skippedExistingCount: number,
  failedCount: number
): string {
  return [
    `Imported ${importedCount}`,
    `Skipped ${skippedExistingCount} existing`,
    `Failed ${failedCount}`,
  ].join(" • ");
}

function formatFailureDescription(
  invalidLineCount: number,
  failures: ImportFailure[]
): string | undefined {
  const parts: string[] = [];

  if (invalidLineCount > 0) {
    parts.push(
      `Invalid line${invalidLineCount === 1 ? "" : "s"}: ${invalidLineCount}`
    );
  }

  for (const failure of failures.slice(0, 2)) {
    const compactMessage = failure.message.replace(/\s+/g, " ").trim();
    const shortMessage =
      compactMessage.length > 100
        ? `${compactMessage.slice(0, 97)}...`
        : compactMessage;
    parts.push(`${failure.playlistId}: ${shortMessage}`);
  }

  if (failures.length > 2) {
    parts.push(`+${failures.length - 2} more API failure(s)`);
  }

  return parts.length > 0 ? parts.join(" | ") : undefined;
}

export default function Home() {
  const playlistStates = useSyncExternalStore(
    subscribePlaylistStates,
    getClientPlaylistStatesSnapshot,
    getServerPlaylistStatesSnapshot
  );

  const playlists = useMemo(() => {
    return Object.values(playlistStates)
      .map((playlistState) => {
        const schedule = buildSchedule(
          playlistState.snapshot.videos,
          playlistState.planConfig,
          playlistState.progressMap
        );

        return {
          playlistState,
          schedule,
        };
      })
      .sort((a, b) =>
        b.playlistState.updatedAt.localeCompare(a.playlistState.updatedAt)
      );
  }, [playlistStates]);

  async function handleAddPlaylists(payload: {
    playlistInputsRaw: string;
    minutesPerDay: number;
    startDate: string;
    playbackSpeed: PlaybackSpeed;
  }): Promise<boolean> {
    const nonEmptyLines = payload.playlistInputsRaw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const invalidLineCount = nonEmptyLines.reduce((count, line) => {
      return parsePlaylistId(line) ? count : count + 1;
    }, 0);
    const playlistIds = parsePlaylistIdsFromMultiline(payload.playlistInputsRaw);

    if (playlistIds.length === 0) {
      toast.error(
        "Enter at least one valid YouTube playlist URL or ID, one per line."
      );
      return false;
    }

    const current = loadPlaylistStates();
    const next = { ...current };
    const failures: ImportFailure[] = [];
    let importedCount = 0;
    let skippedExistingCount = 0;

    for (const playlistId of playlistIds) {
      if (next[playlistId]) {
        skippedExistingCount += 1;
        continue;
      }

      try {
        const snapshot = await fetchPlaylistSnapshot(playlistId);
        next[playlistId] = {
          snapshot,
          planConfig: {
            minutesPerDay: payload.minutesPerDay,
            startDate: payload.startDate,
            playbackSpeed: payload.playbackSpeed,
          },
          progressMap: {},
          updatedAt: new Date().toISOString(),
        };
        importedCount += 1;
      } catch (error) {
        failures.push({
          playlistId,
          message:
            error instanceof Error ? error.message : "Failed to import playlist.",
        });
      }
    }

    if (importedCount > 0) {
      savePlaylistStates(next);
      notifyPlaylistStatesUpdated();
    }

    const failedCount = invalidLineCount + failures.length;
    const summary = formatBatchSummary(
      importedCount,
      skippedExistingCount,
      failedCount
    );
    const description = formatFailureDescription(invalidLineCount, failures);
    const toastOptions = description ? { description } : undefined;

    if (importedCount > 0) {
      toast.success(summary, toastOptions);
      return true;
    }

    toast.error(summary, toastOptions);
    return false;
  }

  function removePlaylist(playlistId: string) {
    const current = loadPlaylistStates();
    const next = { ...current };
    delete next[playlistId];
    savePlaylistStates(next);
    notifyPlaylistStatesUpdated();
    toast.success("Playlist removed from tracker.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-10 lg:px-16">
      <div className="pointer-events-none absolute top-[-140px] left-[-160px] size-[420px] rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-160px] bottom-[-160px] size-[420px] rounded-full bg-orange-400/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl space-y-10">
        <section className="space-y-4">
          <Badge variant="outline">YouTube Watch Planner</Badge>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Plan playlist watch time, daily load, completion date, and progress.
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Import any public playlist, set your minutes per day, and track each
            video as you finish it.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Add Playlist</h2>
          <AddPlaylistForm onSubmit={handleAddPlaylists} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Tracked Playlists</h2>
          {playlists.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No playlists added yet. Import one above to create a watch schedule.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Playlist</TableHead>
                  <TableHead>Videos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Pace</TableHead>
                  <TableHead>Per Day</TableHead>
                  <TableHead>Projected End</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playlists.map(({ playlistState, schedule }) => (
                  <TableRow key={playlistState.snapshot.playlistId}>
                    <TableCell className="space-y-1">
                      <p className="font-medium">{playlistState.snapshot.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {playlistState.snapshot.channelTitle}
                      </p>
                    </TableCell>
                    <TableCell>
                      {schedule.completedVideos}/{schedule.totalVideos}
                    </TableCell>
                    <TableCell>{formatDurationCompact(schedule.totalDurationSec)}</TableCell>
                    <TableCell>
                      {formatDurationCompact(schedule.remainingAdjustedDurationSec)}
                    </TableCell>
                    <TableCell>{playlistState.planConfig.playbackSpeed}x</TableCell>
                    <TableCell>{playlistState.planConfig.minutesPerDay}m</TableCell>
                    <TableCell>
                      {schedule.endDate ? formatShortDate(schedule.endDate) : "Done"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/playlist/${playlistState.snapshot.playlistId}`}
                          >
                            Open
                            <ExternalLink />
                          </Link>
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="icon-sm" variant="ghost" aria-label="Delete">
                              <Trash2 />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Remove playlist?</DialogTitle>
                              <DialogDescription>
                                This removes schedule and progress data for this playlist
                                from local storage.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  removePlaylist(playlistState.snapshot.playlistId)
                                }
                              >
                                Remove
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </main>
  );
}
