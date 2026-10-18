type Props = {
  text: string;
  opacity?: number; // 0..1, за замовчуванням .4
  scale?: number; // 1 — для великого перегляду, менше — для мініатюр
  className?: string;
};

// Повторюваний діагональний напис по всій площі фото: обрізання краю його не прибирає
function tile(text: string, scale: number, opacity: number) {
  const safe = text.replace(/[<>&"']/g, "").slice(0, 40) || "PIXORA";
  const fontSize = 22 * scale;
  const w = Math.round(Math.max(240, safe.length * 20 + 90) * scale);
  const h = Math.round(160 * scale);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
    `<text x='${w / 2}' y='${h / 2}' text-anchor='middle' font-family='Georgia,serif' font-size='${fontSize}' ` +
    `letter-spacing='${4 * scale}' fill='white' fill-opacity='${opacity}' stroke='black' stroke-opacity='.22' ` +
    `stroke-width='${0.8 * scale}' transform='rotate(-28 ${w / 2} ${h / 2})'>${safe}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export default function Watermark({ text, opacity = 0.4, scale = 1, className = "" }: Props) {
  return (
    <div
      aria-hidden="true"
      onContextMenu={(e) => e.preventDefault()}
      className={`absolute inset-0 select-none ${className}`}
      style={{ backgroundImage: tile(text, scale, Math.min(1, Math.max(0.05, opacity))), backgroundRepeat: "repeat" }}
    />
  );
}
