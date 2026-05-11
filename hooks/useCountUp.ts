"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

export function useCountUp(target: number, duration = 1.3) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;

    const controls = animate(from, target, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [target, duration]);

  return value;
}
