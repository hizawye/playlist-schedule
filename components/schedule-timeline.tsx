"use client";

import { ScheduledDay } from "@/lib/types";
import { formatDurationCompact, formatShortDate } from "@/lib/format";

interface ScheduleTimelineProps {
  days: ScheduledDay[];
  playbackSpeed: number;
}

export function ScheduleTimeline({ days, playbackSpeed }: ScheduleTimelineProps) {
  if (days.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Everything is completed for this playlist.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {days.map((day, index) => (
        <div
          key={day.date}
          className="hover:bg-muted/40 flex items-center justify-between rounded-md px-3 py-2 transition-colors"
        >
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Day {index + 1} · {formatShortDate(day.date)}
            </p>
            <p className="text-muted-foreground text-xs">
              {day.videoIds.length} videos planned · at {playbackSpeed}x
            </p>
          </div>
          <p className="text-sm font-semibold">
            {formatDurationCompact(day.plannedDurationSec)}
          </p>
        </div>
      ))}
    </div>
  );
}
