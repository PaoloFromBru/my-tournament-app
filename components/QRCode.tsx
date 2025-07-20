'use client';

interface QRCodeProps {
  value: string;
  size?: number;
}

export default function QRCode({ value, size = 200 }: QRCodeProps) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    value
  )}`;
  return <img src={src} alt="QR code" width={size} height={size} />;
}
