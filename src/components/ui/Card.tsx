import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn.ts";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  /** When false, removes default padding (caller controls inset). */
  readonly padded?: boolean;
}

const Card = ({
  children,
  padded = true,
  className,
  ...rest
}: CardProps) => (
  <div
    className={cn("card", !padded && "card--flush", className)}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
