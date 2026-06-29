import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn.ts";
import { MODAL_VARIANT, type ModalVariant } from "./types.ts";

export { MODAL_VARIANT, type ModalVariant } from "./types.ts";

interface ModalProps {
  readonly open: boolean;
  readonly children: ReactNode;
  readonly onBackdropClick?: () => void;
  readonly role?: "dialog" | "alertdialog";
  readonly "aria-label"?: string;
  readonly "aria-labelledby"?: string;
  readonly testId?: string;
  readonly variant?: ModalVariant;
  readonly backdropClassName?: string;
  readonly panelClassName?: string;
  readonly panelProps?: HTMLAttributes<HTMLDivElement>;
}

export function Modal({
  open,
  children,
  onBackdropClick,
  role = "dialog",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  testId,
  variant = MODAL_VARIANT.DEFAULT,
  backdropClassName,
  panelClassName,
  panelProps,
}: ModalProps) {
  if (!open) return null;

  const handleBackdropClick = onBackdropClick
    ? (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onBackdropClick();
    }
    : undefined;

  return (
    <div
      className={cn("modal-backdrop", backdropClassName)}
      onClick={handleBackdropClick}
      data-testid={testId}
    >
      <div
        className={cn(
          "modal",
          variant === MODAL_VARIANT.NARROW && "modal--narrow",
          variant === MODAL_VARIANT.STRUCTURED && "modal--structured",
          panelClassName,
        )}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onClick={(e) => e.stopPropagation()}
        {...panelProps}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalTitle({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("modal__title", className)} {...rest}>
      {children}
    </h2>
  );
}

export function ModalDescription({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("modal__description", className)} {...rest}>
      {children}
    </p>
  );
}

export function ModalHeader({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("modal__header", className)} {...rest}>
      {children}
    </div>
  );
}

export function ModalBody({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("modal__body", className)} {...rest}>
      {children}
    </div>
  );
}

export function ModalFooter({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("modal__footer", className)} {...rest}>
      {children}
    </div>
  );
}

interface ModalKeyBlockProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
}

export function ModalKeyBlock({
  children,
  className,
  ...rest
}: ModalKeyBlockProps) {
  return (
    <div className={cn("modal__key", className)} {...rest}>
      {children}
    </div>
  );
}

export function ModalActions({
  children,
  stack = false,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { readonly stack?: boolean }) {
  return (
    <div
      className={cn(
        "modal__actions",
        stack && "modal__actions--stack",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
