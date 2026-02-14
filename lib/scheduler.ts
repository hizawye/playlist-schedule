import { addDays, formatISO, isValid, parseISO, startOfDay } from "date-fns";

import { PlanConfig, ScheduleResult, YouTubeVideo } from "@/lib/types";

function normalizeDate(dateText: string): Date {
  const parsed = parseISO(dateText);
  if (isValid(parsed)) {
    return parsed;
  }
  return new Date();
}

function getActiveScheduleStartDate(startDateText: string): Date {
  const configuredStartDate = normalizeDate(startDateText);
  const today = startOfDay(new Date());
  return configuredStartDate < today ? today : configuredStartDate;
}

export function buildSchedule(
  videos: YouTubeVideo[],
  planConfig: PlanConfig,
  progressMap: Record<string, { completed: boolean }>
): ScheduleResult {
  const pace = planConfig.playbackSpeed || 1;

  const totalDurationSec = videos.reduce((sum, video) => sum + video.durationSec, 0);
  const totalVideos = videos.length;

  const remainingVideos = videos.filter((video) => !progressMap[video.videoId]?.completed);
  const remainingDurationSec = remainingVideos.reduce(
    (sum, video) => sum + video.durationSec,
    0
  );

  const completedVideos = totalVideos - remainingVideos.length;
  const completionRate = totalVideos === 0 ? 0 : completedVideos / totalVideos;
  const dailyBudgetSec = Math.max(1, Math.floor(planConfig.minutesPerDay * 60));

  const startDate = getActiveScheduleStartDate(planConfig.startDate);
  const days: ScheduleResult["days"] = [];
  const videoDayMap: Record<string, string> = {};

  let currentDayIndex = 0;
  let currentDay = {
    date: formatISO(startDate, { representation: "date" }),
    videoIds: [] as string[],
    plannedDurationSec: 0,
  };

  for (const video of remainingVideos) {
    const adjustedDurationSec = Math.max(1, Math.ceil(video.durationSec / pace));
    const exceedsBudget =
      currentDay.videoIds.length > 0 &&
      currentDay.plannedDurationSec + adjustedDurationSec > dailyBudgetSec;

    if (exceedsBudget) {
      days.push(currentDay);
      currentDayIndex += 1;
      currentDay = {
        date: formatISO(addDays(startDate, currentDayIndex), {
          representation: "date",
        }),
        videoIds: [],
        plannedDurationSec: 0,
      };
    }

    currentDay.videoIds.push(video.videoId);
    currentDay.plannedDurationSec += adjustedDurationSec;
    videoDayMap[video.videoId] = currentDay.date;
  }

  if (currentDay.videoIds.length > 0) {
    days.push(currentDay);
  }

  const endDate = days.length > 0 ? days[days.length - 1].date : null;
  const totalAdjustedDurationSec = videos.reduce(
    (sum, video) => sum + Math.max(1, Math.ceil(video.durationSec / pace)),
    0
  );
  const remainingAdjustedDurationSec = remainingVideos.reduce(
    (sum, video) => sum + Math.max(1, Math.ceil(video.durationSec / pace)),
    0
  );

  return {
    days,
    videoDayMap,
    endDate,
    totalDurationSec,
    remainingDurationSec,
    totalAdjustedDurationSec,
    remainingAdjustedDurationSec,
    dailyAdjustedBudgetSec: dailyBudgetSec,
    totalVideos,
    remainingVideos: remainingVideos.length,
    completedVideos,
    completionRate,
  };
}
