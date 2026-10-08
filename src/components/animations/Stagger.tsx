import type { ReactNode } from "react";
import { useStaggerReveal } from "../../hooks/useScrollReveal.js";

type StaggerProps = {
  children: ReactNode;
  delay?: number;
  staggerDelay?: number;
  duration?: number;
  distance?: number;
  className?: string;
};

export default function Stagger({
  children,
  delay = 0,
  staggerDelay = 0.12,
  duration = 0.9,
  distance = 30,
  className,
}: StaggerProps) {
  const { ref, getChildStyle } = useStaggerReveal({
    delay,
    staggerDelay,
    duration,
    distance,
  });

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <div key={index} style={getChildStyle(index)}>
              {child}
            </div>
          ))
        : children}
    </div>
  );
}
