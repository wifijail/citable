import { ImageResponse } from 'next/og';
import { AI_CRAWLERS } from '@/lib/audit/crawlers';
import { CHECK_COUNT } from '@/lib/audit/registry';
import { BRAND, MarkBoxes } from '@/lib/brand-image';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Citable — can AI assistants read your site?';

/**
 * Social preview card. Text stays in English for every locale: the built-in
 * image font has no Cyrillic glyphs, and a card with missing letters is worse
 * than an English one.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: BRAND.ink,
          color: '#f1f0f8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <MarkBoxes size={64} color="#f1f0f8" gap={BRAND.ink} />
          <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>citable</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
            Can AI assistants read your site?
          </div>
          <div style={{ fontSize: 30, color: '#a5a2bc' }}>
            {`${CHECK_COUNT} checks · ${AI_CRAWLERS.length} AI agents · robots.txt, rendering, structured data`}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
