'use client';

import { ArrowRight, Menu as MenuIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useI18n } from './providers';
import { LocaleSwitcher } from './ui/locale-switcher';
import { Logo } from './ui/logo';
import { ThemeToggle } from './ui/theme-toggle';

export function Navbar() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile sheet whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  const links = [
    { href: `/${locale}#features`, label: t.nav.product },
    { href: `/${locale}/pricing`, label: t.nav.pricing },
    { href: `/${locale}/methodology`, label: t.nav.methodology },
    { href: `/${locale}/docs`, label: t.nav.docs },
    { href: `/${locale}/contact`, label: t.nav.contact },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-300',
        scrolled || open ? 'border-b border-line bg-bg/75 backdrop-blur-xl' : 'border-b border-transparent',
      )}
    >
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <ul className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm transition',
                      active ? 'text-fg' : 'text-muted hover:text-fg',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <Link href={`/${locale}#scan`} className="btn-primary hidden !py-2 sm:inline-flex">
            {t.nav.scanCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line md:hidden"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            // No height animation / overflow clipping here: the language and theme
            // popovers inside the sheet must be able to extend past its bottom edge.
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden"
          >
            <div className="container-page flex flex-col gap-1 pb-5">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base text-fg hover:bg-surface-2"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 flex items-center gap-2 px-1">
                <LocaleSwitcher align="left" />
                <ThemeToggle align="left" />
                <Link href={`/${locale}#scan`} onClick={() => setOpen(false)} className="btn-primary ml-auto">
                  {t.nav.scanCta}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
