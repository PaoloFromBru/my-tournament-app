import { MouseEventHandler, ReactNode } from "react";

type BuiltInVariant = "default" | "outline" | "destructive";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: BuiltInVariant | string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function Button({
  children,
  className = "",
  onClick,
  variant = "default",
  type = "button",
  disabled = false,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition";
  const variants = {
    default: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline: "border border-gray-300 text-gray-800 hover:bg-gray-100",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };

  const variantClass =
    Object.prototype.hasOwnProperty.call(variants, variant) && variant
      ? (variants as Record<BuiltInVariant, string>)[variant as BuiltInVariant]
      : variant;

  const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      type={type}
      className={`${base} ${variantClass} ${disabledClass} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
