/**
 * The logo mark for generated images (favicons, social cards). next/og renders a
 * subset of CSS, so the mark is drawn as absolutely positioned rounded boxes
 * instead of an SVG mask: a big square, a background-coloured "gap" square, and
 * the small square on top.
 */
export function MarkBoxes({ size, color, gap }: { size: number; color: string; gap: string }) {
  const u = size / 32;
  const box = (x: number, y: number, w: number, h: number, r: number, background: string) => (
    <div
      style={{
        position: 'absolute',
        left: x * u,
        top: y * u,
        width: w * u,
        height: h * u,
        borderRadius: r * u,
        background,
      }}
    />
  );

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex' }}>
      {box(2, 9, 20, 21, 5.5, color)}
      {box(12.4, 1.4, 17.2, 16.2, 5.6, gap)}
      {box(14.5, 3.5, 13, 12, 3.8, color)}
    </div>
  );
}

export const BRAND = {
  accent: '#6842ff',
  mint: '#3ddbb4',
  ink: '#08070d',
  paper: '#fafafc',
} as const;
