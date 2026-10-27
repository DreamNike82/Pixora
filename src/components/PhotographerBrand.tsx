import { useState } from "react";
import type { Photographer } from "../api/clientGallery";
import Logo from "./Logo";

// Ініціали для аватара-заглушки: «Іван Коваленко» → «ІК»
const initials = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "P";

/** Логотип фотографа; якщо його немає або він не завантажився — лого Pixora. */
export function BrandLogo({ photographer }: { photographer?: Photographer }) {
  const [failed, setFailed] = useState(false);
  const src = photographer?.logoUrl;
  if (!src || failed) return <Logo light />;
  return (
    <img
      src={src}
      alt={photographer?.studioName || photographer?.name || "Логотип фотографа"}
      onError={() => setFailed(true)}
      draggable={false}
      className="block h-12 w-auto max-w-[220px] select-none object-contain object-left sm:h-14"
    />
  );
}

/** Аватар + ім'я (і студія) фотографа. Без аватара показуємо кружечок з ініціалами. */
export function PhotographerCard({ photographer }: { photographer?: Photographer }) {
  const [failed, setFailed] = useState(false);
  if (!photographer?.name && !photographer?.studioName) return null;
  const label = photographer.name ?? photographer.studioName;

  return (
    <div className="mt-5 flex items-center gap-3">
      {photographer.avatarUrl && !failed ? (
        <img
          src={photographer.avatarUrl}
          alt={label}
          onError={() => setFailed(true)}
          draggable={false}
          className="h-12 w-12 select-none rounded-full border border-white/25 object-cover"
        />
      ) : (
        <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/10 font-serif text-lg text-white/85">
          {initials(label)}
        </span>
      )}
      <p className="text-sm leading-5 text-white/75">
        <span className="block text-[11px] uppercase tracking-[0.18em] text-white/45">Фотограф</span>
        <span className="font-medium text-white">{label}</span>
        {photographer.studioName && photographer.name && <span className="block text-xs text-white/55">{photographer.studioName}</span>}
      </p>
    </div>
  );
}
