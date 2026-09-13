'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useI18n } from '../providers';
import { Menu, MenuItem } from './menu';

const OPTIONS = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Monitor },
] as const;

export function ThemeToggle({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { t } = useI18n();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The theme is only known in the browser; render a neutral icon until then.
  useEffect(() => setMounted(true), []);
  const TriggerIcon = !mounted ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <Menu align={align} label={t.theme.label} trigger={<TriggerIcon className="h-4 w-4" />}>
      {(close) =>
        OPTIONS.map(({ value, Icon }) => (
          <MenuItem
            key={value}
            active={mounted && theme === value}
            onSelect={() => {
              setTheme(value);
              close();
            }}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{t.theme[value]}</span>
            {mounted && theme === value && <Check className="h-4 w-4 text-accent" />}
          </MenuItem>
        ))
      }
    </Menu>
  );
}
