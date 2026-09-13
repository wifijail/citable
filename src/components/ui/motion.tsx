'use client';

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { LogoMark } from './logo';

/** Fades and lifts children into place the first time they scroll into view. */
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
      initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Card with a cursor-following spotlight and a gentle 3D tilt.
 * Both effects are pointer-only, so touch devices get a static card.
 */
export function SpotlightCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [5, -5]), { stiffness: 180, damping: 18 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-5, 5]), { stiffness: 180, damping: 18 });

  return (
    <motion.div
      ref={ref}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        px.set(x);
        py.set(y);
        ref.current.style.setProperty('--spot-x', `${x * 100}%`);
        ref.current.style.setProperty('--spot-y', `${y * 100}%`);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
      className={cn(
        'card group relative overflow-hidden',
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
        'before:bg-[radial-gradient(420px_circle_at_var(--spot-x,50%)_var(--spot-y,50%),rgb(var(--accent)/0.12),transparent_60%)]',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts up to `value` when it scrolls into view. The server renders the real
 * number, so crawlers and no-JS visitors never see a placeholder zero.
 */
export function AnimatedNumber({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const armed = useRef(false);

  // Only numbers still below the fold are reset for the count-up, so nothing flickers.
  useEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!reduce && rect && rect.top > window.innerHeight) {
      armed.current = true;
      setDisplay(0);
    }
  }, [reduce]);

  useEffect(() => {
    if (!inView || !armed.current) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {display}
      {suffix}
    </span>
  );
}

/** Infinite horizontal ticker; content is duplicated for a seamless loop. */
export function Marquee({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'group relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]',
        className,
      )}
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className="flex shrink-0 animate-marquee items-center gap-3 pr-3 group-hover:[animation-play-state:paused]"
        >
          {children}
        </div>
      ))}
    </div>
  );
}

/**
 * The logo mark as a slowly spinning glass cube, with the flat mark floating
 * inside. Pure CSS 3D transforms.
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
          <LogoMark className="h-1/2 w-1/2 drop-shadow-[0_0_18px_rgb(var(--accent)/0.6)]" />
        </div>
      </div>
    </div>
  );
}
