import { motion } from "motion/react";
import type { ReactNode } from "react";

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
  duration = 0.6,
  distance = 50,
  className,
}: FadeRightProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: distance,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
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
