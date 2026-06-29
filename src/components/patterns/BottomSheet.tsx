import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn.ts";

const DISMISS_THRESHOLD_PX = 120;

interface BottomSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly ariaLabel: string;
  readonly children: ReactNode;
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly overlay?: ReactNode;
  readonly testId?: string;
  /** When false, backdrop clicks do not call onClose. Default true. */
  readonly dismissOnBackdrop?: boolean;
}

/**
 * Mobile bottom sheet chrome: backdrop, drag-to-dismiss handle, header/body/footer slots.
 * Domain content (mission list, editor) goes in `children`.
 */
export function BottomSheet({
  open,
  onClose,
  ariaLabel,
  children,
  header,
  footer,
  overlay,
  testId = "bottom-sheet",
  dismissOnBackdrop = true,
}: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const draggingRef = useRef(false);
  const suppressBackdropRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    suppressBackdropRef.current = true;
    const id = requestAnimationFrame(() => {
      suppressBackdropRef.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const handleBackdropClick = useCallback(() => {
    if (!dismissOnBackdrop || suppressBackdropRef.current) return;
    onClose();
  }, [dismissOnBackdrop, onClose]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartY.current = e.clientY;
    draggingRef.current = true;
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    setDragY(Math.max(0, e.clientY - dragStartY.current));
  }, []);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    draggingRef.current = false;
    setIsDragging(false);
    setDragY(0);
    if (delta > DISMISS_THRESHOLD_PX) onClose();
  }, [onClose]);

  const sheetTransform = isDragging
    ? `translateY(${dragY}px)`
    : open
    ? "translateY(0)"
    : "translateY(100%)";

  const backdropOpacity = isDragging
    ? Math.max(0, 0.4 * (1 - dragY / 300))
    : undefined;

  return (
    <>
      <div
        className={cn(
          "bottom-sheet-backdrop",
          open && "bottom-sheet-backdrop--visible",
        )}
        style={backdropOpacity !== undefined
          ? { opacity: backdropOpacity }
          : undefined}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <div
        className={cn(
          "bottom-sheet",
          open && "bottom-sheet--open",
          isDragging && "bottom-sheet--dragging",
        )}
        style={{ transform: sheetTransform }}
        role="dialog"
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <div
          className="sheet-drag-zone"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          aria-hidden="true"
        >
          <div className="sheet-drag-bar" />
        </div>

        {header}

        <div className="sheet-body">{children}</div>

        {footer}

        {overlay}
      </div>
    </>
  );
}
