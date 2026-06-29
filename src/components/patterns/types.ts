export const MODAL_VARIANT = {
  DEFAULT: "default",
  NARROW: "narrow",
  STRUCTURED: "structured",
} as const;

export type ModalVariant = (typeof MODAL_VARIANT)[keyof typeof MODAL_VARIANT];
