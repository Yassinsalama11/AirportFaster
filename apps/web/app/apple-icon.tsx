import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)',
        borderRadius: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#1a1a1a',
        fontWeight: 800,
        fontSize: 72,
        fontFamily: 'sans-serif',
        letterSpacing: '-2px',
      }}
    >
      AF
    </div>,
    { ...size },
  );
}
