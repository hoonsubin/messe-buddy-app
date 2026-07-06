export const playerTemplateStorageKey = (playerId: string): string =>
  `mb_player_template_${playerId}`;

export const readAppliedTemplate = (playerId: string): string | null => {
  try {
    return localStorage.getItem(playerTemplateStorageKey(playerId));
  } catch {
    return null;
  }
};

export const writeAppliedTemplate = (
  playerId: string,
  name: string,
): void => {
  try {
    localStorage.setItem(playerTemplateStorageKey(playerId), name);
  } catch {
    /* ignore */
  }
};
