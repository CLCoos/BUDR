import { ImageResponse } from 'next/og';

export const size = {
  width: 52,
  height: 52,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        border: '2px solid #5DCAA5',
        background: 'linear-gradient(90deg, rgba(93,202,165,0.18) 0%, rgba(133,183,235,0.18) 100%)',
        color: '#0f172a',
        fontSize: 26,
        fontWeight: 700,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      B
    </div>,
    size
  );
}
