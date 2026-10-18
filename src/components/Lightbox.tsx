import { useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { Photo } from "../api/photos";
import Icon from "./Icon";
import Watermark from "./Watermark";

type Props = {
  photos: Photo[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
  watermarkText?: string | null; // null — без водяного знака
  renderActions?: (photo: Photo) => ReactNode; // додаткові кнопки у верхній панелі (серце, скачати)
};

export default function Lightbox({ photos, index, onChange, onClose, watermarkText, renderActions }: Props) {
  const photo = photos[index];
  const count = photos.length;

  const prev = useCallback(() => onChange((index - 1 + count) % count), [index, count, onChange]);
  const next = useCallback(() => onChange((index + 1) % count), [index, count, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // блокуємо прокрутку сторінки під переглядом
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, prev, next]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Перегляд фото ${photo.filename}`}
      className="fixed inset-0 z-[100] flex select-none items-center justify-center bg-[#1a0a0f]/95 backdrop-blur-sm print:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 text-white/80 sm:px-8">
        <p className="truncate pr-4 text-sm">{photo.filename} <span className="ml-2 text-white/45">{index + 1} / {count}</span></p>
        <div className="flex items-center gap-2">
          {renderActions?.(photo)}
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20" aria-label="Закрити перегляд">
            <Icon name="close" size={20} />
          </button>
        </div>
      </div>

      {count > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 rotate-180 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6" aria-label="Попереднє фото">
            <Icon name="arrow" size={22} />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6" aria-label="Наступне фото">
            <Icon name="arrow" size={22} />
          </button>
        </>
      )}

      {/* inline-block, щоб знак накривав рівно площу фото, а не весь екран */}
      <div className="relative inline-block max-h-[82vh] max-w-[92vw]">
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.filename}
          draggable={false}
          className="block max-h-[82vh] max-w-[92vw] select-none object-contain"
        />
        {watermarkText && <Watermark text={watermarkText} />}
      </div>
    </div>
  );
}
