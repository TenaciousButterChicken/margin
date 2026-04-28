import * as React from "react";

// Per design brief §5.1: three variants, three sizes. State treatments
// match the .btn rules in tokens.css; we stay class-based so the
// register-aware radius shifts (public 8px / lab 12px) come for free.

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variant: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
};
const size: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant: v = "secondary", size: s = "md", className = "", ...rest }, ref) => (
    <button
      ref={ref}
      className={`${variant[v]} ${size[s]} ${className}`.trim()}
      {...rest}
    />
  )
);
Button.displayName = "Button";
