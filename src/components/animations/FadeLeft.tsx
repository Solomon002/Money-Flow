import type { ReactNode } from "react";
import { useScrollReveal } from "../../hooks/useScrollReveal.js";

type FadeLeftProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
};

export default function FadeLeft({
  children,
  delay = 0,
  duration = 0.9,
  distance = 50,
  className,
}: FadeLeftProps) {
  const { ref, style } = useScrollReveal({
    direction: "left",
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
