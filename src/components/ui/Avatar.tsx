import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn.ts";

interface AvatarProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  readonly src?: string;
  readonly initials?: string;
  readonly fallback?: ReactNode;
  readonly "aria-label": string;
}

const Avatar = ({
  src,
  initials,
  fallback,
  className,
  type = "button",
  ...rest
}: AvatarProps) => (
  <button
    type={type}
    className={cn("avatar", className)}
    {...rest}
  >
    {src
      ? <img src={src} alt="" width="32" height="32" />
      : initials
      ? <span className="avatar__initials">{initials}</span>
      : fallback}
  </button>
);

export default Avatar;
