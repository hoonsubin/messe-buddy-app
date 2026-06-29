// UI primitive variant constants (C-12: const object + keyof union).

export const BUTTON_VARIANT = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
  GHOST: "ghost",
  DESTRUCTIVE: "destructive",
} as const;
export type ButtonVariant = (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

export const ICON_BUTTON_VARIANT = {
  DEFAULT: "default",
  ON_PRIMARY: "onPrimary",
} as const;
export type IconButtonVariant =
  (typeof ICON_BUTTON_VARIANT)[keyof typeof ICON_BUTTON_VARIANT];
