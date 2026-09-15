'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { LogoMark } from './logo';

/** Fades children into place the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The logo mark as a slowly spinning glass cube, with the flat mark inside.
 * Pure CSS 3D transforms; used as the loading indicator.
 */
export function LogoCube({ size = 96, className }: { size?: number; className?: string }) {
  const half = size / 2;
  const faces = [
    `rotateY(0deg) translateZ(${half}px)`,
    `rotateY(90deg) translateZ(${half}px)`,
    `rotateY(180deg) translateZ(${half}px)`,
    `rotateY(-90deg) translateZ(${half}px)`,
    `rotateX(90deg) translateZ(${half}px)`,
    `rotateX(-90deg) translateZ(${half}px)`,
  ];
  return (
    <div className={cn('cube-scene grid place-items-center', className)} style={{ width: size * 1.6, height: size * 1.6 }}>
      <div className="cube animate-cube-spin" style={{ width: size, height: size }}>
        {faces.map((transform) => (
          <span key={transform} style={{ transform }} />
        ))}
        <div className="absolute inset-0 grid place-items-center text-accent" style={{ transform: 'translateZ(0)' }}>
          <LogoMark className="h-1/2 w-1/2" />
        </div>
      </div>
    </div>
  );
}
