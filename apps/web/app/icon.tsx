import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#1a1a1a',
        fontWeight: 800,
        fontSize: 13,
        fontFamily: 'sans-serif',
        letterSpacing: '-0.5px',
      }}
    >
      AF
    </div>,
    { ...size },
  );
}
