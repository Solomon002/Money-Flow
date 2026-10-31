import { useEffect, useState } from "react";

type TypewriterTextProps = {
  text: string;
  onDone?: () => void;
  onProgress?: () => void;
};

// Long replies still finish in about 3 seconds.
const TARGET_DURATION_MS = 3000;
const TICK_MS = 20;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/*
 * Reveals a Coach reply as if it were being typed, with a blinking
 * MoneyFlow-green cursor at the end.
 */
export default function TypewriterText({
  text,
  onDone,
  onProgress,
}: TypewriterTextProps) {
  const [visibleLength, setVisibleLength] = useState(() =>
    prefersReducedMotion() ? text.length : 0,
  );

  useEffect(() => {
    if (visibleLength >= text.length) {
      onDone?.();
      return;
    }

    const step = Math.max(
      1,
      Math.ceil(text.length / (TARGET_DURATION_MS / TICK_MS)),
    );

    const timer = window.setTimeout(() => {
      setVisibleLength((current) => Math.min(current + step, text.length));
      onProgress?.();
    }, TICK_MS);

    return () => window.clearTimeout(timer);
  }, [visibleLength, text, onDone, onProgress]);

  const isTyping = visibleLength < text.length;

  return (
    <>
      {text.slice(0, visibleLength)}
      {isTyping && <span className="mf-type-cursor" aria-hidden="true" />}
    </>
  );
}
