/** Stable query key factories — one string per cached read. */

export const queryKeys = {
  sessionMeta: (sessionId: string): string => `sessionMeta:${sessionId}`,

  journey: (sessionId: string, playerId: string): string =>
    `journey:${sessionId}:${playerId}`,

  playerUid: (uid: string): string => `player:uid:${uid}`,

  playerId: (playerId: string): string => `player:id:${playerId}`,

  progress: (playerId: string): string => `progress:${playerId}`,

  buddy: (playerId: string): string => `buddy:${playerId}`,

  resources: (sessionId: string, playerId: string): string =>
    `resources:${sessionId}:${playerId}`,

  templates: (): string => "templates",

  gmRoster: (sessionId: string): string => `gmRoster:${sessionId}`,

  formSchema: (missionId: string): string => `formSchema:${missionId}`,

  libraryResources: (): string => "libraryResources",

  buddyPicker: (sessionId: string): string => `buddyPicker:${sessionId}`,
} as const;
