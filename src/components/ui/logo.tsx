'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId } from 'react';
import { cn } from '@/lib/cn';
import { useI18n } from '../providers';

/**
 * The two-squares mark, redrawn as vector so it stays crisp at any size and
 * follows the theme through `currentColor`.
 */
export function LogoMark({ className }: { className?: string }) {
  const maskId = `mark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="currentColor">
      <defs>
        <mask id={maskId}>
          <rect width="32" height="32" fill="white" />
          {/* Cut a gap around the small square so the two shapes interlock. */}
          <rect x="12.4" y="1.4" width="17.2" height="16.2" rx="5.6" fill="black" />
        </mask>
      </defs>
      <rect x="2" y="9" width="20" height="21" rx="5.5" mask={`url(#${maskId})`} />
      <rect x="14.5" y="3.5" width="13" height="12" rx="3.8" />
    </svg>
  );
}

/** Logo link: always returns to the home page of the current language. */
export function Logo({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const home = `/${locale}`;

  return (
    <Link
      href={home}
      aria-label={t.nav.home}
      className={cn('group inline-flex items-center gap-2 text-fg', className)}
      onClick={(event) => {
        // Already home: Next would do nothing, so glide back to the top instead.
        if (pathname === home) {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }}
    >
      <LogoMark className="h-7 w-7 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-105" />
      <span className="text-[1.35rem] font-semibold tracking-tight">citable</span>
    </Link>
  );
}
