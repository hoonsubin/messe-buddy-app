import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn.ts";
import { ICON_BUTTON_VARIANT, type IconButtonVariant } from "./types.ts";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: IconButtonVariant;
  readonly children: ReactNode;
}

const IconButton = ({
  variant = ICON_BUTTON_VARIANT.DEFAULT,
  className,
  type = "button",
  children,
  ...rest
}: IconButtonProps) => (
  <button
    type={type}
    className={cn(
      "icon-btn",
      variant === ICON_BUTTON_VARIANT.ON_PRIMARY && "icon-btn--on-primary",
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

export default IconButton;
