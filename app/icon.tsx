import { ImageResponse } from 'next/og';

/**
 * Browser tab icon: the D4 monogram set in type on the carmine accent.
 *
 * Lettering rather than a drawn mark, because DESIGN.md bans hand-rolled SVG
 * and the brand's real mark exists only as a gold render. Square corners,
 * like everything else. Generated at build time, so it costs no request-time
 * work.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#a82519',
          color: '#ffffff',
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: -0.5,
          fontFamily: 'Georgia, serif',
        }}
      >
        D4
      </div>
    ),
    size,
  );
}
