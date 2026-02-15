import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { PlanConfig, PlaylistSnapshot, PlaylistState, PlaybackSpeed, VideoProgress } from "@/lib/types";

const playlistWithRelations = {
  videos: {
    orderBy: {
      position: "asc",
    },
  },
  progresses: true,
} satisfies Prisma.PlaylistInclude;

type PlaylistWithRelations = Prisma.PlaylistGetPayload<{
  include: typeof playlistWithRelations;
}>;

interface PlaylistCompositeKey {
  userId: string;
  youtubePlaylistId: string;
}

interface CreatePlaylistInput {
  userId: string;
  snapshot: PlaylistSnapshot;
  planConfig: PlanConfig;
}

interface MigratePlaylistInput {
  userId: string;
  clientMigrationKey: string;
  playlistStates: PlaylistState[];
}

export interface MigrationSummary {
  importedPlaylists: number;
  skippedPlaylists: number;
  importedProgressEntries: number;
  alreadyMigrated: boolean;
}

function parsePlaybackSpeed(value: Prisma.Decimal): PlaybackSpeed {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 1.5 || numeric === 1.75 || numeric === 2) {
    return numeric;
  }
  return 1;
}

function parseStartDate(startDate: string): Date {
  const parsed = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function serializeDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoOrNow(value?: string): Date {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function mapProgressMap(progresses: { youtubeVideoId: string; completed: boolean; completedAt: Date | null }[]) {
  return progresses.reduce<Record<string, VideoProgress>>((acc, progress) => {
    acc[progress.youtubeVideoId] = {
      completed: progress.completed,
      completedAt: progress.completedAt?.toISOString(),
    };
    return acc;
  }, {});
}

function mapPlaylistState(row: PlaylistWithRelations): PlaylistState {
  const videos = row.videos.map((video) => ({
    videoId: video.youtubeVideoId,
    title: video.title,
    durationSec: video.durationSec,
    thumbnailUrl: video.thumbnailUrl,
    position: video.position,
    publishedAt: video.publishedAt ?? undefined,
  }));

  const totalDurationSec = videos.reduce((sum, video) => sum + video.durationSec, 0);

  return {
    snapshot: {
      playlistId: row.youtubePlaylistId,
      title: row.title,
      channelTitle: row.channelTitle,
      fetchedAt: row.fetchedAt.toISOString(),
      videos,
      totalDurationSec,
      videoCount: videos.length,
    },
    planConfig: {
      minutesPerDay: row.minutesPerDay,
      startDate: serializeDateOnly(row.startDate),
      playbackSpeed: parsePlaybackSpeed(row.playbackSpeed),
    },
    progressMap: mapProgressMap(row.progresses),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadPlaylistStateByKey(
  tx: Prisma.TransactionClient,
  key: PlaylistCompositeKey
): Promise<PlaylistState | null> {
  const playlist = await tx.playlist.findUnique({
    where: {
      userId_youtubePlaylistId: {
        userId: key.userId,
        youtubePlaylistId: key.youtubePlaylistId,
      },
    },
    include: playlistWithRelations,
  });

  if (!playlist) {
    return null;
  }

  return mapPlaylistState(playlist);
}

function buildPlaylistWriteData(snapshot: PlaylistSnapshot, planConfig: PlanConfig) {
  return {
    title: snapshot.title,
    channelTitle: snapshot.channelTitle,
    fetchedAt: parseIsoOrNow(snapshot.fetchedAt),
    minutesPerDay: planConfig.minutesPerDay,
    startDate: parseStartDate(planConfig.startDate),
    playbackSpeed: new Prisma.Decimal(planConfig.playbackSpeed),
    updatedAt: new Date(),
  };
}

async function syncPlaylistVideos(
  tx: Prisma.TransactionClient,
  playlistId: string,
  snapshot: PlaylistSnapshot
): Promise<void> {
  const videoIds = snapshot.videos.map((video) => video.videoId);

  await tx.playlistVideo.deleteMany({
    where: {
      playlistId,
    },
  });

  if (snapshot.videos.length > 0) {
    await tx.playlistVideo.createMany({
      data: snapshot.videos.map((video) => ({
        playlistId,
        youtubeVideoId: video.videoId,
        title: video.title,
        durationSec: video.durationSec,
        thumbnailUrl: video.thumbnailUrl,
        position: video.position,
        publishedAt: video.publishedAt,
      })),
    });
  }

  await tx.videoProgress.deleteMany({
    where: {
      playlistId,
      ...(videoIds.length > 0
        ? {
            youtubeVideoId: {
              notIn: videoIds,
            },
          }
        : {}),
    },
  });
}

async function createPlaylistFromState(
  tx: Prisma.TransactionClient,
  userId: string,
  state: PlaylistState
): Promise<number> {
  const playlist = await tx.playlist.create({
    data: {
      userId,
      youtubePlaylistId: state.snapshot.playlistId,
      ...buildPlaylistWriteData(state.snapshot, state.planConfig),
      updatedAt: parseIsoOrNow(state.updatedAt),
    },
  });

  await syncPlaylistVideos(tx, playlist.id, state.snapshot);

  const validVideoIds = new Set(state.snapshot.videos.map((video) => video.videoId));
  const completedProgressEntries = Object.entries(state.progressMap).filter(
    ([youtubeVideoId, progress]) =>
      progress.completed && validVideoIds.has(youtubeVideoId)
  );

  if (completedProgressEntries.length > 0) {
    await tx.videoProgress.createMany({
      data: completedProgressEntries.map(([youtubeVideoId, progress]) => ({
        playlistId: playlist.id,
        youtubeVideoId,
        completed: true,
        completedAt: parseIsoOrNow(progress.completedAt),
      })),
      skipDuplicates: true,
    });
  }

  return completedProgressEntries.length;
}

export async function listPlaylistStatesForUser(userId: string): Promise<PlaylistState[]> {
  const playlists = await db.playlist.findMany({
    where: {
      userId,
    },
    include: playlistWithRelations,
    orderBy: {
      updatedAt: "desc",
    },
  });

  return playlists.map(mapPlaylistState);
}

export async function getPlaylistStateForUser(
  userId: string,
  youtubePlaylistId: string
): Promise<PlaylistState | null> {
  const playlist = await db.playlist.findUnique({
    where: {
      userId_youtubePlaylistId: {
        userId,
        youtubePlaylistId,
      },
    },
    include: playlistWithRelations,
  });

  if (!playlist) {
    return null;
  }

  return mapPlaylistState(playlist);
}

export async function createPlaylistForUser(
  input: CreatePlaylistInput
): Promise<PlaylistState | null> {
  const existing = await db.playlist.findUnique({
    where: {
      userId_youtubePlaylistId: {
        userId: input.userId,
        youtubePlaylistId: input.snapshot.playlistId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return null;
  }

  return db.$transaction(async (tx) => {
    const playlist = await tx.playlist.create({
      data: {
        userId: input.userId,
        youtubePlaylistId: input.snapshot.playlistId,
        ...buildPlaylistWriteData(input.snapshot, input.planConfig),
      },
      select: {
        id: true,
      },
    });

    await syncPlaylistVideos(tx, playlist.id, input.snapshot);

    const state = await loadPlaylistStateByKey(tx, {
      userId: input.userId,
      youtubePlaylistId: input.snapshot.playlistId,
    });

    if (!state) {
      throw new Error("Created playlist state could not be loaded.");
    }

    return state;
  });
}

export async function refreshPlaylistForUser(
  input: CreatePlaylistInput
): Promise<PlaylistState | null> {
  return db.$transaction(async (tx) => {
    const playlist = await tx.playlist.findUnique({
      where: {
        userId_youtubePlaylistId: {
          userId: input.userId,
          youtubePlaylistId: input.snapshot.playlistId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!playlist) {
      return null;
    }

    await tx.playlist.update({
      where: {
        id: playlist.id,
      },
      data: buildPlaylistWriteData(input.snapshot, input.planConfig),
    });

    await syncPlaylistVideos(tx, playlist.id, input.snapshot);

    return loadPlaylistStateByKey(tx, {
      userId: input.userId,
      youtubePlaylistId: input.snapshot.playlistId,
    });
  });
}

export async function updatePlaylistConfigForUser(
  userId: string,
  youtubePlaylistId: string,
  patch: Partial<PlanConfig>
): Promise<PlaylistState | null> {
  return db.$transaction(async (tx) => {
    const playlist = await tx.playlist.findUnique({
      where: {
        userId_youtubePlaylistId: {
          userId,
          youtubePlaylistId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!playlist) {
      return null;
    }

    const data: Prisma.PlaylistUpdateInput = {
      updatedAt: new Date(),
    };

    if (patch.minutesPerDay !== undefined) {
      data.minutesPerDay = patch.minutesPerDay;
    }

    if (patch.startDate !== undefined) {
      data.startDate = parseStartDate(patch.startDate);
    }

    if (patch.playbackSpeed !== undefined) {
      data.playbackSpeed = new Prisma.Decimal(patch.playbackSpeed);
    }

    await tx.playlist.update({
      where: {
        id: playlist.id,
      },
      data,
    });

    return loadPlaylistStateByKey(tx, {
      userId,
      youtubePlaylistId,
    });
  });
}

export async function setVideoCompletionForUser(
  userId: string,
  youtubePlaylistId: string,
  youtubeVideoId: string,
  completed: boolean
): Promise<PlaylistState | null> {
  return db.$transaction(async (tx) => {
    const playlist = await tx.playlist.findUnique({
      where: {
        userId_youtubePlaylistId: {
          userId,
          youtubePlaylistId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!playlist) {
      return null;
    }

    const video = await tx.playlistVideo.findUnique({
      where: {
        playlistId_youtubeVideoId: {
          playlistId: playlist.id,
          youtubeVideoId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!video) {
      return null;
    }

    if (completed) {
      await tx.videoProgress.upsert({
        where: {
          playlistId_youtubeVideoId: {
            playlistId: playlist.id,
            youtubeVideoId,
          },
        },
        create: {
          playlistId: playlist.id,
          youtubeVideoId,
          completed: true,
          completedAt: new Date(),
        },
        update: {
          completed: true,
          completedAt: new Date(),
        },
      });
    } else {
      await tx.videoProgress.deleteMany({
        where: {
          playlistId: playlist.id,
          youtubeVideoId,
        },
      });
    }

    await tx.playlist.update({
      where: {
        id: playlist.id,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return loadPlaylistStateByKey(tx, {
      userId,
      youtubePlaylistId,
    });
  });
}

export async function deletePlaylistForUser(
  userId: string,
  youtubePlaylistId: string
): Promise<boolean> {
  const result = await db.playlist.deleteMany({
    where: {
      userId,
      youtubePlaylistId,
    },
  });

  return result.count > 0;
}

export async function migrateLocalPlaylistStatesForUser(
  input: MigratePlaylistInput
): Promise<MigrationSummary> {
  const existingMigration = await db.migrationEvent.findUnique({
    where: {
      userId_clientMigrationKey: {
        userId: input.userId,
        clientMigrationKey: input.clientMigrationKey,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingMigration) {
    return {
      importedPlaylists: 0,
      skippedPlaylists: 0,
      importedProgressEntries: 0,
      alreadyMigrated: true,
    };
  }

  return db.$transaction(async (tx) => {
    await tx.migrationEvent.create({
      data: {
        userId: input.userId,
        clientMigrationKey: input.clientMigrationKey,
      },
    });

    await tx.userSettings.upsert({
      where: {
        userId: input.userId,
      },
      create: {
        userId: input.userId,
        localMigrationCompletedAt: new Date(),
      },
      update: {
        localMigrationCompletedAt: new Date(),
      },
    });

    let importedPlaylists = 0;
    let skippedPlaylists = 0;
    let importedProgressEntries = 0;

    for (const state of input.playlistStates) {
      const existingPlaylist = await tx.playlist.findUnique({
        where: {
          userId_youtubePlaylistId: {
            userId: input.userId,
            youtubePlaylistId: state.snapshot.playlistId,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingPlaylist) {
        skippedPlaylists += 1;
        continue;
      }

      importedProgressEntries += await createPlaylistFromState(tx, input.userId, state);
      importedPlaylists += 1;
    }

    return {
      importedPlaylists,
      skippedPlaylists,
      importedProgressEntries,
      alreadyMigrated: false,
    };
  });
}
