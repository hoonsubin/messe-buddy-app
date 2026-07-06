import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn.ts";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly hasError?: boolean;
}

export const Input = ({
  hasError = false,
  className,
  ...rest
}: InputProps) => (
  <input
    className={cn("form-input", hasError && "form-input--error", className)}
    {...rest}
  />
);

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly hasError?: boolean;
}

export const Textarea = ({
  hasError = false,
  className,
  ...rest
}: TextareaProps) => (
  <textarea
    className={cn("form-input", hasError && "form-input--error", className)}
    {...rest}
  />
);
