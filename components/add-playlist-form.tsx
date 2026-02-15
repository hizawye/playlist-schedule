"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlaybackSpeed } from "@/lib/types";

interface AddPlaylistFormProps {
  onSubmit: (payload: {
    playlistInputsRaw: string;
    minutesPerDay: number;
    startDate: string;
    playbackSpeed: PlaybackSpeed;
  }) => Promise<boolean>;
}

function todayDateValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddPlaylistForm({ onSubmit }: AddPlaylistFormProps) {
  const [playlistInputsRaw, setPlaylistInputsRaw] = useState("");
  const [minutesPerDay, setMinutesPerDay] = useState(45);
  const [startDate, setStartDate] = useState(todayDateValue());
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);
  const [isLoading, setIsLoading] = useState(false);

  const submitDisabled = useMemo(() => {
    return !playlistInputsRaw.trim() || minutesPerDay <= 0 || isLoading;
  }, [isLoading, minutesPerDay, playlistInputsRaw]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled) {
      return;
    }

    try {
      setIsLoading(true);
      const shouldResetInput = await onSubmit({
        playlistInputsRaw,
        minutesPerDay,
        startDate,
        playbackSpeed,
      });
      if (shouldResetInput) {
        setPlaylistInputsRaw("");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="playlist-input">Playlist URLs or IDs</Label>
        <Textarea
          id="playlist-input"
          value={playlistInputsRaw}
          onChange={(event) => setPlaylistInputsRaw(event.target.value)}
          placeholder={[
            "https://www.youtube.com/playlist?list=PL1234567890abcdef",
            "PL0987654321abcdef",
          ].join("\n")}
          rows={5}
          autoComplete="off"
        />
        <p className="text-muted-foreground text-xs">
          Paste one playlist link or ID per line.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="minutes-per-day">Minutes Per Day</Label>
          <Input
            id="minutes-per-day"
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            value={minutesPerDay}
            onChange={(event) => setMinutesPerDay(Number(event.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start-date">Start Date</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="playback-speed">Playback Speed</Label>
          <Select
            value={String(playbackSpeed)}
            onValueChange={(value) => setPlaybackSpeed(Number(value) as PlaybackSpeed)}
          >
            <SelectTrigger id="playback-speed">
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
      </div>
      <Button type="submit" disabled={submitDisabled} className="w-full sm:w-auto">
        {isLoading ? <Loader2 className="animate-spin" /> : null}
        Import Playlists
      </Button>
    </form>
  );
}
