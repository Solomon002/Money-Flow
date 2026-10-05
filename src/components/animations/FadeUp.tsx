import { motion } from "motion/react";
import type { ReactNode } from "react";

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
  duration = 0.6,
  distance = 40,
  className,
}: FadeUpProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: distance,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.2,
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
