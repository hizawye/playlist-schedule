"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { ExternalLink, LogOut, Trash2 } from "lucide-react";
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
import {
  deletePlaylist,
  fetchPlaylists,
  importPlaylist,
  migrateLocalState,
} from "@/lib/client/playlists-api";
import { formatDurationCompact, formatShortDate } from "@/lib/format";
import { buildSchedule } from "@/lib/scheduler";
import { loadPlaylistStates, playlistStorageMeta } from "@/lib/storage";
import { buildClientMigrationKey } from "@/lib/storage-migration";
import { PlaybackSpeed, PlaylistState } from "@/lib/types";
import { parsePlaylistId, parsePlaylistIdsFromMultiline } from "@/lib/youtube";

interface DashboardClientProps {
  userDisplayName: string;
}

interface ImportFailure {
  playlistId: string;
  message: string;
}

function sortPlaylistStates(states: PlaylistState[]): PlaylistState[] {
  return [...states].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
    parts.push(`Invalid line${invalidLineCount === 1 ? "" : "s"}: ${invalidLineCount}`);
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

export function DashboardClient({ userDisplayName }: DashboardClientProps) {
  const [playlistStates, setPlaylistStates] = useState<PlaylistState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigratingLocalState, setIsMigratingLocalState] = useState(false);

  const playlists = useMemo(() => {
    return sortPlaylistStates(playlistStates).map((playlistState) => {
      const schedule = buildSchedule(
        playlistState.snapshot.videos,
        playlistState.planConfig,
        playlistState.progressMap
      );

      return {
        playlistState,
        schedule,
      };
    });
  }, [playlistStates]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const serverPlaylists = await fetchPlaylists();
        if (!isMounted) {
          return;
        }
        setPlaylistStates(serverPlaylists);

        const localStates = loadPlaylistStates();
        if (Object.keys(localStates).length === 0) {
          return;
        }

        setIsMigratingLocalState(true);

        const migrationSummary = await migrateLocalState({
          clientMigrationKey: buildClientMigrationKey(localStates),
          playlists: Object.values(localStates),
        });

        window.localStorage.removeItem(playlistStorageMeta.key);

        if (migrationSummary.importedPlaylists > 0 && isMounted) {
          const refreshed = await fetchPlaylists();
          if (isMounted) {
            setPlaylistStates(refreshed);
          }

          toast.success(
            [
              `Migrated ${migrationSummary.importedPlaylists} playlists`,
              `Imported ${migrationSummary.importedProgressEntries} progress entries`,
              `Skipped ${migrationSummary.skippedPlaylists} existing`,
            ].join(" • ")
          );
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load account playlists.";
          toast.error(message);
        }
      } finally {
        if (isMounted) {
          setIsMigratingLocalState(false);
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

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
      toast.error("Enter at least one valid YouTube playlist URL or ID, one per line.");
      return false;
    }

    const existingPlaylistIds = new Set(
      playlistStates.map((state) => state.snapshot.playlistId)
    );

    const imported: PlaylistState[] = [];
    const failures: ImportFailure[] = [];
    let skippedExistingCount = 0;

    for (const playlistId of playlistIds) {
      if (existingPlaylistIds.has(playlistId)) {
        skippedExistingCount += 1;
        continue;
      }

      try {
        const response = await importPlaylist(playlistId, {
          minutesPerDay: payload.minutesPerDay,
          startDate: payload.startDate,
          playbackSpeed: payload.playbackSpeed,
        });

        imported.push(response.playlist);
        existingPlaylistIds.add(playlistId);
      } catch (error) {
        failures.push({
          playlistId,
          message: error instanceof Error ? error.message : "Failed to import playlist.",
        });
      }
    }

    if (imported.length > 0) {
      setPlaylistStates((current) => sortPlaylistStates([...current, ...imported]));
    }

    const failedCount = invalidLineCount + failures.length;
    const summary = formatBatchSummary(imported.length, skippedExistingCount, failedCount);
    const description = formatFailureDescription(invalidLineCount, failures);
    const toastOptions = description ? { description } : undefined;

    if (imported.length > 0) {
      toast.success(summary, toastOptions);
      return true;
    }

    toast.error(summary, toastOptions);
    return false;
  }

  async function handleRemovePlaylist(playlistId: string) {
    try {
      await deletePlaylist(playlistId);
      setPlaylistStates((current) =>
        current.filter((state) => state.snapshot.playlistId !== playlistId)
      );
      toast.success("Playlist removed from tracker.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove playlist.";
      toast.error(message);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-10 lg:px-16">
      <div className="pointer-events-none absolute top-[-140px] left-[-160px] size-[420px] rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[-160px] bottom-[-160px] size-[420px] rounded-full bg-orange-400/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl space-y-10">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline">YouTube Watch Planner</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void signOut({ callbackUrl: "/sign-in" })}
            >
              <LogOut />
              Sign out
            </Button>
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            Plan playlist watch time, daily load, completion date, and progress.
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Signed in as {userDisplayName}. Import any public playlist, set your
            minutes per day, and track each video as you finish it.
          </p>
          {isMigratingLocalState ? (
            <p className="text-muted-foreground text-sm">
              Migrating local playlist data into your account...
            </p>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Add Playlist</h2>
          <AddPlaylistForm onSubmit={handleAddPlaylists} />
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Tracked Playlists</h2>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading account playlists...</p>
          ) : playlists.length === 0 ? (
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
                          <Link href={`/playlist/${playlistState.snapshot.playlistId}`}>
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
                                This removes the playlist from your account, including
                                schedule and progress data.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="destructive"
                                onClick={() =>
                                  void handleRemovePlaylist(
                                    playlistState.snapshot.playlistId
                                  )
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
