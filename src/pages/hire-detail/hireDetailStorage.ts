export const hireTemplateStorageKey = (sessionId: string): string =>
  `mb_hire_template_${sessionId}`;

export const readAppliedTemplate = (sessionId: string): string | null => {
  try {
    return localStorage.getItem(hireTemplateStorageKey(sessionId));
  } catch {
    return null;
  }
};

export const writeAppliedTemplate = (
  sessionId: string,
  name: string,
): void => {
  try {
    localStorage.setItem(hireTemplateStorageKey(sessionId), name);
  } catch {
    /* ignore */
  }
};
