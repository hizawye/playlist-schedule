"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ScheduleTimeline } from "@/components/schedule-timeline";
import { VideoTable, VideoTableRow } from "@/components/video-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchPlaylist,
  refreshPlaylist,
  updatePlaylistConfig,
  updatePlaylistProgress,
} from "@/lib/client/playlists-api";
import { formatDurationCompact, formatShortDate } from "@/lib/format";
import { buildSchedule } from "@/lib/scheduler";
import { PlaybackSpeed, PlaylistState } from "@/lib/types";

interface PlaylistDetailClientProps {
  playlistId: string;
}

function todayDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PlaylistDetailClient({ playlistId }: PlaylistDetailClientProps) {
  const [playlistState, setPlaylistState] = useState<PlaylistState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const schedule = useMemo(() => {
    if (!playlistState) {
      return null;
    }
    return buildSchedule(
      playlistState.snapshot.videos,
      playlistState.planConfig,
      playlistState.progressMap
    );
  }, [playlistState]);

  const rows = useMemo<VideoTableRow[]>(() => {
    if (!playlistState || !schedule) {
      return [];
    }

    return playlistState.snapshot.videos.map((video) => ({
      videoId: video.videoId,
      title: video.title,
      durationSec: video.durationSec,
      adjustedDurationSec: Math.max(
        1,
        Math.ceil(video.durationSec / playlistState.planConfig.playbackSpeed)
      ),
      plannedDate: schedule.videoDayMap[video.videoId] ?? null,
      completed: Boolean(playlistState.progressMap[video.videoId]?.completed),
      completedAt: playlistState.progressMap[video.videoId]?.completedAt,
    }));
  }, [playlistState, schedule]);

  useEffect(() => {
    let isMounted = true;

    async function loadPlaylist() {
      try {
        const playlist = await fetchPlaylist(playlistId);
        if (!isMounted) {
          return;
        }
        setPlaylistState(playlist);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Failed to load playlist.";

        if (message.toLowerCase().includes("not found")) {
          setPlaylistState(null);
        } else {
          toast.error(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPlaylist();

    return () => {
      isMounted = false;
    };
  }, [playlistId]);

  async function applyConfigPatch(patch: Partial<PlaylistState["planConfig"]>) {
    if (!playlistState) {
      return;
    }

    try {
      const next = await updatePlaylistConfig(playlistId, patch);
      setPlaylistState(next);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update plan settings.";
      toast.error(message);
    }
  }

  async function toggleCompletion(videoId: string, completed: boolean) {
    if (!playlistState) {
      return;
    }

    const optimistic: PlaylistState = {
      ...playlistState,
      progressMap: {
        ...playlistState.progressMap,
        [videoId]: completed
          ? { completed: true, completedAt: new Date().toISOString() }
          : { completed: false },
      },
      updatedAt: new Date().toISOString(),
    };

    setPlaylistState(optimistic);

    try {
      const next = await updatePlaylistProgress(playlistId, videoId, completed);
      setPlaylistState(next);
    } catch (error) {
      setPlaylistState(playlistState);
      const message =
        error instanceof Error ? error.message : "Failed to update progress.";
      toast.error(message);
    }
  }

  async function handleRefreshPlaylist() {
    if (!playlistState) {
      return;
    }

    try {
      setIsRefreshing(true);
      const next = await refreshPlaylist(playlistId);
      setPlaylistState(next);
      toast.success("Playlist data refreshed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refresh playlist.";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
        <p className="text-muted-foreground">Loading playlist...</p>
      </main>
    );
  }

  if (!playlistState || !schedule) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Playlist not found</h1>
          <p className="text-muted-foreground">
            This playlist is not currently tracked on your account.
          </p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-10 lg:px-16">
      <div className="pointer-events-none absolute top-[-120px] right-[-120px] size-[360px] rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/">
                <ArrowLeft />
                Dashboard
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold tracking-tight">
              {playlistState.snapshot.title}
            </h1>
            <p className="text-muted-foreground text-sm">
              {playlistState.snapshot.channelTitle}
            </p>
          </div>
          <Button
            onClick={handleRefreshPlaylist}
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
            Refresh from YouTube
          </Button>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 rounded-md bg-white/5 px-4 py-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Total Videos
            </p>
            <p className="text-2xl font-semibold">{schedule.totalVideos}</p>
          </div>
          <div className="space-y-1 rounded-md bg-white/5 px-4 py-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Remaining Time
            </p>
            <p className="text-2xl font-semibold">
              {formatDurationCompact(schedule.remainingAdjustedDurationSec)}
            </p>
            <p className="text-muted-foreground text-xs">
              Raw: {formatDurationCompact(schedule.remainingDurationSec)}
            </p>
          </div>
          <div className="space-y-1 rounded-md bg-white/5 px-4 py-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Completed
            </p>
            <p className="text-2xl font-semibold">
              {schedule.completedVideos}/{schedule.totalVideos}
            </p>
          </div>
          <div className="space-y-1 rounded-md bg-white/5 px-4 py-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Projected End
            </p>
            <p className="text-2xl font-semibold">
              {schedule.endDate ? formatShortDate(schedule.endDate) : "Done"}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <Label htmlFor="minutes-per-day-detail">Minutes Per Day</Label>
              <Input
                id="minutes-per-day-detail"
                type="number"
                min={1}
                max={600}
                value={playlistState.planConfig.minutesPerDay}
                onChange={(event) => {
                  const minutesPerDay = Math.max(1, Number(event.target.value));
                  void applyConfigPatch({ minutesPerDay });
                }}
                className="w-full md:w-56"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-date-detail">Start Date</Label>
              <Input
                id="start-date-detail"
                type="date"
                value={playlistState.planConfig.startDate || todayDateValue()}
                onChange={(event) =>
                  void applyConfigPatch({
                    startDate: event.target.value || todayDateValue(),
                  })
                }
                className="w-full md:w-56"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playback-speed-detail">Playback Speed</Label>
              <Select
                value={String(playlistState.planConfig.playbackSpeed)}
                onValueChange={(value) =>
                  void applyConfigPatch({
                    playbackSpeed: Number(value) as PlaybackSpeed,
                  })
                }
              >
                <SelectTrigger id="playback-speed-detail" className="w-full md:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="1.75">1.75x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="h-9 px-3 text-xs md:ml-auto">
              {playlistState.planConfig.minutesPerDay}m/day ·{" "}
              {playlistState.planConfig.playbackSpeed}x
            </Badge>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Daily Schedule</h2>
          <ScheduleTimeline
            days={schedule.days}
            playbackSpeed={playlistState.planConfig.playbackSpeed}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Videos</h2>
          <VideoTable rows={rows} onToggleComplete={toggleCompletion} />
        </section>
      </div>
    </main>
  );
}
