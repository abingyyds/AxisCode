'use client';
import React from 'react';
import { motion, useMotionValue, useAnimationFrame, useTransform } from 'motion/react';

interface ShinyTextProps {
  text: string;
  speed?: number;
  className?: string;
}

const ShinyText: React.FC<ShinyTextProps> = ({ text, speed = 2, className = '' }) => {
  const progress = useMotionValue(0);
  const elapsed = React.useRef(0);
  const last = React.useRef<number | null>(null);

  useAnimationFrame(time => {
    if (last.current === null) { last.current = time; return; }
    elapsed.current += time - last.current;
    last.current = time;
    progress.set((elapsed.current % (speed * 1000)) / (speed * 1000) * 100);
  });

  const bgPos = useTransform(progress, p => `${150 - p * 2}% center`);

  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{
        backgroundImage: 'linear-gradient(120deg, #b5b5b5 0%, #b5b5b5 35%, #fff 50%, #b5b5b5 65%, #b5b5b5 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundPosition: bgPos,
      }}
    >
      {text}
    </motion.span>
  );
};

export default ShinyText;
