'use client';

import { cn } from '@/lib/cn';
import { ENGINES, ENGINE_IDS, type EngineId } from '@/lib/audit/crawlers';
import { SITE_PAGE_LIMITS } from '@/lib/audit/limits';
import { SITE_TYPES, type SiteType } from '@/lib/audit/types';
import { useI18n } from '../providers';
import { useScan } from './scan-context';

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface-2 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-[0.6rem] px-3 py-1.5 text-sm transition',
            value === option.value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Scan settings: page or site, site type, assistants that matter, training policy. */
export function ScanOptionsPanel({ plan }: { plan: 'free' | 'pro' | 'agency' }) {
  const { t } = useI18n();
  const o = t.scanner.options;
  const { settings, setSettings, busy } = useScan();

  const toggleEngine = (engine: EngineId) => {
    const selected = settings.engines.includes(engine)
      ? settings.engines.filter((id) => id !== engine)
      : [...settings.engines, engine];
    setSettings({ ...settings, engines: selected });
  };

  return (
    <fieldset disabled={busy} className="space-y-5 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">{o.mode}</p>
        <Segmented
          label={o.mode}
          value={settings.mode}
          onChange={(mode) => setSettings({ ...settings, mode })}
          options={[
            { value: 'page', label: o.modePage },
            { value: 'site', label: o.modeSite },
          ]}
        />
        {settings.mode === 'site' && <p className="text-xs text-faint">{o.modeSiteHint(SITE_PAGE_LIMITS[plan])}</p>}
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium">{o.siteType}</span>
        <select
          value={settings.siteType}
          onChange={(event) => setSettings({ ...settings, siteType: event.target.value as 'auto' | SiteType })}
          className="input !py-2 text-sm"
        >
          <option value="auto">{o.siteTypeAuto}</option>
          {SITE_TYPES.map((type) => (
            <option key={type} value={type}>
              {t.siteTypes[type]}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">{o.engines}</p>
          {settings.engines.length < ENGINE_IDS.length && (
            <button
              type="button"
              onClick={() => setSettings({ ...settings, engines: [...ENGINE_IDS] })}
              className="text-xs text-muted underline underline-offset-2 hover:text-fg"
            >
              {o.allEngines}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ENGINES.map((engine) => {
            const active = settings.engines.includes(engine.id);
            return (
              <button
                key={engine.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleEngine(engine.id)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition',
                  active ? 'border-fg/70 bg-fg text-bg' : 'border-line text-muted hover:border-line-strong hover:text-fg',
                )}
              >
                {engine.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-faint">{o.enginesHint}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{o.training}</p>
        <Segmented
          label={o.training}
          value={settings.blockTraining ? 'block' : 'allow'}
          onChange={(value) => setSettings({ ...settings, blockTraining: value === 'block' })}
          options={[
            { value: 'allow', label: o.trainingAllow },
            { value: 'block', label: o.trainingBlock },
          ]}
        />
        <p className="text-xs text-faint">{o.trainingHint}</p>
      </div>
    </fieldset>
  );
}
