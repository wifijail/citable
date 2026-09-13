'use client';

import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useId, useState } from 'react';

function toneFor(score: number): string {
  if (score >= 75) return 'rgb(var(--pass))';
  if (score >= 50) return 'rgb(var(--warn))';
  return 'rgb(var(--fail))';
}

/** Animated gradient ring with the score counting up in the middle. */
export function ScoreRing({ score, grade, label, size = 176 }: { score: number; grade: string; label: string; size?: number }) {
  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? score : 0);

  useEffect(() => {
    if (reduce) {
      setShown(score);
      return;
    }
    const controls = animate(0, score, {
      duration: 1.3,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (latest) => setShown(latest),
    });
    return () => controls.stop();
  }, [score, reduce]);

  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - shown / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${score}/100, ${grade}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'rgb(var(--accent))' }} />
            <stop offset="100%" style={{ stopColor: toneFor(score) }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} style={{ stroke: 'rgb(var(--border))' }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tabular-nums tracking-tight">{Math.round(shown)}</span>
        <span className="mt-1 rounded-full border border-line px-2 py-0.5 font-mono text-[11px] uppercase text-muted">
          {grade}
        </span>
      </div>
    </div>
  );
}
