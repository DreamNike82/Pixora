import { useEffect, useState } from "react";
import { galleriesApi } from "../../api/galleries";
import type { Selection } from "../../api/galleries";
import Icon from "../Icon";

const statusLabel: Record<string, string> = { PENDING: "Очікує", DONE: "Оброблено" };

/** Відбори, які клієнти надіслали фотографу, + експорт назв файлів для Lightroom. */
export default function SelectionsPanel({ galleryId }: { galleryId: string }) {
  const [items, setItems] = useState<Selection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    galleriesApi
      .selections(galleryId)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Не вдалося завантажити відбори"));
  }, [galleryId]);

  const copyForLightroom = async (s: Selection) => {
    try {
      const { filenames } = await galleriesApi.exportSelection(galleryId, s.id);
      await navigator.clipboard.writeText(filenames.join(", "));
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не вдалося скопіювати список");
    }
  };

  const remove = async (s: Selection) => {
    if (!confirm(`Видалити відбір клієнта «${s.clientName}»?`)) return;
    try {
      await galleriesApi.removeSelection(galleryId, s.id);
      setItems((cur) => cur?.filter((x) => x.id !== s.id) ?? null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не вдалося видалити відбір");
    }
  };

  return (
    <section className="pb-20 sm:pb-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <h2 className="font-serif text-3xl text-[#4d1020]">Відбори клієнтів</h2>
        {error && <p role="alert" className="mt-4 rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">{error}</p>}
        {!error && items === null && <p className="mt-4 text-sm text-[#766961]">Завантаження…</p>}
        {items?.length === 0 && <p className="mt-4 text-sm text-[#766961]">Клієнти ще не надсилали відбір.</p>}

        {items && items.length > 0 && (
          <ul className="mt-6 divide-y divide-[#dccdc4] overflow-hidden rounded-[24px] border border-[#ddcfc6] bg-[#f8f1eb]">
            {items.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 p-5 sm:px-8">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-2xl text-[#4d1020]">{s.clientName}</p>
                  <p className="mt-1 text-xs text-[#766961]">Фото: {s.photoCount} · {statusLabel[s.status] ?? s.status}</p>
                </div>
                <button onClick={() => copyForLightroom(s)} className="button border border-[#d8c7bd] text-[#6e605a]">
                  <Icon name={copiedId === s.id ? "check" : "copy"} size={16} /> {copiedId === s.id ? "Скопійовано" : "Для Lightroom"}
                </button>
                <button onClick={() => remove(s)} className="rounded-full p-2 text-[#8d7a71] transition hover:bg-[#71142a]/10 hover:text-[#71142a]" aria-label={`Видалити відбір ${s.clientName}`}>
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
