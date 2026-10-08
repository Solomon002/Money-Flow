import type { ReactNode } from "react";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";

type FadeRightProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
};

export default function FadeRight({
  children,
  delay = 0,
  duration = 0.9,
  distance = 50,
  className,
}: FadeRightProps) {
  const { ref, style } = useScrollReveal({
    direction: "right",
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
