"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { formatDurationCompact, formatShortDate } from "@/lib/format";
import { buildSchedule } from "@/lib/scheduler";
import { loadPlaylistStates, savePlaylistStates } from "@/lib/storage";
import {
  PlaybackSpeed,
  PlaylistSnapshot,
  PlaylistState,
  VideoProgress,
} from "@/lib/types";

interface PlaylistDetailClientProps {
  playlistId: string;
}

async function fetchPlaylistSnapshot(playlistId: string): Promise<PlaylistSnapshot> {
  const response = await fetch(
    `/api/youtube/playlist?playlistId=${encodeURIComponent(playlistId)}`
  );
  const payload = (await response.json()) as PlaylistSnapshot | { error: string };
  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error : "Could not refresh playlist.");
  }
  return payload;
}

function getStateByPlaylistId(playlistId: string): PlaylistState | null {
  const states = loadPlaylistStates();
  return states[playlistId] ?? null;
}

function todayDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PlaylistDetailClient({ playlistId }: PlaylistDetailClientProps) {
  const [playlistState, setPlaylistState] = useState<PlaylistState | null>(() =>
    getStateByPlaylistId(playlistId)
  );
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

  function persist(nextPlaylistState: PlaylistState) {
    const allStates = loadPlaylistStates();
    allStates[playlistId] = nextPlaylistState;
    savePlaylistStates(allStates);
    setPlaylistState(nextPlaylistState);
  }

  function updatePlanConfig(patch: Partial<PlaylistState["planConfig"]>) {
    if (!playlistState) {
      return;
    }
    persist({
      ...playlistState,
      planConfig: {
        ...playlistState.planConfig,
        ...patch,
      },
      updatedAt: new Date().toISOString(),
    });
  }

  function toggleCompletion(videoId: string, completed: boolean) {
    if (!playlistState) {
      return;
    }

    const current = playlistState.progressMap[videoId] ?? { completed: false };
    const nextProgress: VideoProgress = completed
      ? { completed: true, completedAt: new Date().toISOString() }
      : { completed: false };

    persist({
      ...playlistState,
      progressMap: {
        ...playlistState.progressMap,
        [videoId]:
          current.completed === nextProgress.completed &&
          current.completedAt === nextProgress.completedAt
            ? current
            : nextProgress,
      },
      updatedAt: new Date().toISOString(),
    });
  }

  async function refreshPlaylist() {
    if (!playlistState) {
      return;
    }

    try {
      setIsRefreshing(true);
      const snapshot = await fetchPlaylistSnapshot(playlistId);
      const nextProgressMap: Record<string, VideoProgress> = {};

      for (const video of snapshot.videos) {
        if (playlistState.progressMap[video.videoId]) {
          nextProgressMap[video.videoId] = playlistState.progressMap[video.videoId];
        }
      }

      persist({
        ...playlistState,
        snapshot,
        progressMap: nextProgressMap,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Playlist data refreshed.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refresh playlist.";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  if (!playlistState || !schedule) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Playlist not found</h1>
          <p className="text-muted-foreground">
            This playlist is not currently tracked in local storage.
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
          <Button onClick={refreshPlaylist} variant="outline" disabled={isRefreshing}>
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
                onChange={(event) =>
                  updatePlanConfig({
                    minutesPerDay: Math.max(1, Number(event.target.value)),
                  })
                }
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
                  updatePlanConfig({ startDate: event.target.value || todayDateValue() })
                }
                className="w-full md:w-56"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playback-speed-detail">Playback Speed</Label>
              <Select
                value={String(playlistState.planConfig.playbackSpeed)}
                onValueChange={(value) =>
                  updatePlanConfig({
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
              {playlistState.planConfig.minutesPerDay}m/day · {playlistState.planConfig.playbackSpeed}x
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
