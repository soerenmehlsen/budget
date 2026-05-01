"use client";

import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  RefAttributes,
} from "react";
import { useRef } from "react";

type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

type AnimatedIcon = ComponentType<
  HTMLAttributes<HTMLDivElement> & { size?: number } & RefAttributes<AnimatedIconHandle>
>;

type AnimatedIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  Icon: AnimatedIcon;
  iconClassName?: string;
  iconSize?: number;
};

export function AnimatedIconButton({
  Icon,
  children,
  iconClassName,
  iconSize = 20,
  onMouseEnter,
  onMouseLeave,
  ...props
}: AnimatedIconButtonProps) {
  const iconRef = useRef<AnimatedIconHandle>(null);

  return (
    <button
      {...props}
      onMouseEnter={(event) => {
        iconRef.current?.startAnimation();
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        iconRef.current?.stopAnimation();
        onMouseLeave?.(event);
      }}
    >
      <Icon
        ref={iconRef}
        aria-hidden="true"
        className={iconClassName}
        size={iconSize}
      />
      {children}
    </button>
  );
}
