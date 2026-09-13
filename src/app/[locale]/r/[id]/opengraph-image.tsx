import { ImageResponse } from 'next/og';
import { auditEn } from '@/i18n/audit/en';
import { BRAND, MarkBoxes } from '@/lib/brand-image';
import { getStore } from '@/lib/db';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'AI visibility report';

function tone(score: number): string {
  if (score >= 75) return '#4ade80';
  if (score >= 50) return '#facc15';
  return '#f87171';
}

/** Share card for a stored report: domain, score and the six category bars. */
export default async function ReportImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scan = /^[0-9a-zA-Z]{12}$/.test(id) ? await getStore().getScan(id).catch(() => null) : null;

  const host = scan ? new URL(scan.finalUrl).hostname : 'citable';
  const score = scan?.score ?? 0;
  const categories = scan?.report.categories ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: 64,
          gap: 56,
          background: BRAND.ink,
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(104,66,255,0.35), transparent 50%)',
          color: '#f1f0f8',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <MarkBoxes size={44} color="#f1f0f8" gap={BRAND.ink} />
            <span style={{ fontSize: 32, fontWeight: 600 }}>citable</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 26, color: '#a5a2bc' }}>AI Visibility Score</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 180, fontWeight: 700, lineHeight: 1, color: tone(score) }}>{score}</span>
              <span style={{ fontSize: 44, color: '#a5a2bc' }}>/100</span>
            </div>
            <span style={{ fontSize: 34, fontWeight: 600, marginTop: 12 }}>{host}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, flex: 1 }}>
          {categories.map((category) => (
            <div key={category.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24 }}>
                <span>{auditEn.categories[category.id].label}</span>
                <span style={{ color: '#a5a2bc' }}>{category.score}</span>
              </div>
              <div style={{ display: 'flex', height: 12, borderRadius: 999, background: '#242234' }}>
                <div
                  style={{
                    width: `${Math.max(2, category.score)}%`,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${BRAND.accent}, ${BRAND.mint})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
