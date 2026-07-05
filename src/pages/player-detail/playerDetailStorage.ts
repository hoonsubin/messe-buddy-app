export const playerTemplateStorageKey = (sessionId: string): string =>
  `mb_player_template_${sessionId}`;

export const readAppliedTemplate = (sessionId: string): string | null => {
  try {
    return localStorage.getItem(playerTemplateStorageKey(sessionId));
  } catch {
    return null;
  }
};

export const writeAppliedTemplate = (
  sessionId: string,
  name: string,
): void => {
  try {
    localStorage.setItem(playerTemplateStorageKey(sessionId), name);
  } catch {
    /* ignore */
  }
};
