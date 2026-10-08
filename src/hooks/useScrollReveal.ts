import { useEffect, useRef, useState } from "react";

export type RevealDirection = "up" | "left" | "right" | "zoom";

type UseScrollRevealOptions = {
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  threshold?: number;
};

function getTransform(direction: RevealDirection, distance: number) {
  switch (direction) {
    case "left":
      return `translateX(-${distance}px)`;
    case "right":
      return `translateX(${distance}px)`;
    case "zoom":
      return `scale(${Math.max(0, 1 - distance / 500)})`;
    case "up":
    default:
      return `translateY(${distance}px)`;
  }
}

export function useScrollReveal({
  direction = "up",
  delay = 0,
  duration = 0.6,
  distance = 40,
  threshold = 0.15,
}: UseScrollRevealOptions = {}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    setReduceMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setReduceMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    if (reduceMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [reduceMotion, threshold]);

  const style: React.CSSProperties = reduceMotion
    ? {
        opacity: 1,
        transform: "none",
        transition: "none",
      }
    : {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "none" : getTransform(direction, distance),
        transition: `opacity ${duration}s ease ${delay}s, transform ${duration}s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}s`,
        willChange: "opacity, transform",
      };

  return { ref, style, isVisible, reduceMotion };
}

export function useStaggerReveal({
  staggerDelay = 0.08,
  delay = 0,
  duration = 0.5,
  distance = 30,
  threshold = 0.15,
}: {
  staggerDelay?: number;
  delay?: number;
  duration?: number;
  distance?: number;
  threshold?: number;
} = {}) {
  const { ref, isVisible, reduceMotion } = useScrollReveal({
    direction: "up",
    delay,
    duration,
    distance,
    threshold,
  });

  function getChildStyle(index: number): React.CSSProperties {
    if (reduceMotion) {
      return {
        opacity: 1,
        transform: "none",
        transition: "none",
      };
    }

    const childDelay = delay + index * staggerDelay;

    return {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "none" : `translateY(${distance}px)`,
      transition: `opacity ${duration}s ease ${childDelay}s, transform ${duration}s cubic-bezier(0.2, 0.7, 0.2, 1) ${childDelay}s`,
      willChange: "opacity, transform",
    };
  }

  return { ref, isVisible, reduceMotion, getChildStyle };
}