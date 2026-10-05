import { motion } from "motion/react";
import type { ReactNode } from "react";

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
  staggerDelay = 0.08,
  duration = 0.5,
  distance = 30,
  className,
}: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{
        once: true,
        amount: 0.2,
      }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: delay,
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: {
                  opacity: 0,
                  y: distance,
                },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration,
                    ease: "easeOut",
                  },
                },
              }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}
