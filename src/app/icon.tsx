import { ImageResponse } from 'next/og';
import { BRAND, MarkBoxes } from '@/lib/brand-image';

/**
 * Favicons generated from the vector mark. Only the symbol is used: the full
 * "citable" wordmark becomes an unreadable smudge at 16–32 px.
 */
export function generateImageMetadata() {
  return [
    { id: 'small', size: { width: 32, height: 32 }, contentType: 'image/png' },
    { id: 'medium', size: { width: 192, height: 192 }, contentType: 'image/png' },
    { id: 'large', size: { width: 512, height: 512 }, contentType: 'image/png' },
  ];
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const resolved = await id;
  const size = resolved === 'large' ? 512 : resolved === 'medium' ? 192 : 32;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND.accent,
          borderRadius: size * 0.22,
        }}
      >
        <MarkBoxes size={size * 0.72} color="#ffffff" gap={BRAND.accent} />
      </div>
    ),
    { width: size, height: size },
  );
}
