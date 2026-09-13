import { ImageResponse } from 'next/og';
import { BRAND, MarkBoxes } from '@/lib/brand-image';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Citable — can AI search cite your site?';

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
          backgroundImage: `radial-gradient(circle at 85% 20%, rgba(104,66,255,0.45), transparent 45%), radial-gradient(circle at 10% 90%, rgba(61,219,180,0.25), transparent 40%)`,
          color: '#f1f0f8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <MarkBoxes size={64} color="#f1f0f8" gap={BRAND.ink} />
          <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>citable</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
            Can AI search cite your site?
          </div>
          <div style={{ fontSize: 30, color: '#a5a2bc' }}>
            16 AI agents · 31 checks · free scan in ~5 seconds
          </div>
        </div>
      </div>
    ),
    size,
  );
}
