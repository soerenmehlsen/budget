import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  const tileSize = Math.round(size.width * 0.78);
  const iconSize = Math.round(size.width * 0.46);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            width: tileSize,
            height: tileSize,
            borderRadius: Math.round(tileSize * 0.32),
            backgroundColor: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 18px 40px rgba(59, 130, 246, 0.35)",
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width={iconSize}
            height={iconSize}
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 7.5h10.8a2.7 2.7 0 0 1 2.7 2.7v6.3a2.4 2.4 0 0 1-2.4 2.4H7.2A2.7 2.7 0 0 1 4.5 16.2V7.5Z" />
            <path d="M18 10.5h-3.1a2 2 0 0 0 0 4H18" />
            <path d="M8 7.5V5.8A1.8 1.8 0 0 1 9.8 4h7.4" />
          </svg>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  );
}
