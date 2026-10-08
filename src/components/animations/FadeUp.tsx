import type { ReactNode } from "react";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";

type FadeUpProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
};

export default function FadeUp({
  children,
  delay = 0,
  duration = 0.9,
  distance = 40,
  className,
}: FadeUpProps) {
  const { ref, style } = useScrollReveal({
    direction: "up",
    delay,
    duration,
    distance,
  });

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
}
