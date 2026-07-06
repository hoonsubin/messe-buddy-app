import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn.ts";
import { BUTTON_VARIANT, type ButtonVariant } from "./types.ts";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly fullWidth?: boolean;
  readonly children: ReactNode;
}

const Button = ({
  variant = BUTTON_VARIANT.PRIMARY,
  fullWidth = false,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={cn(
      "btn",
      `btn--${variant}`,
      fullWidth && "btn--full",
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

export default Button;
