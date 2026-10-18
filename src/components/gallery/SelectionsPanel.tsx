import { useCallback, useEffect, useState } from "react";
import { galleriesApi } from "../../api/galleries";
import type { Selection } from "../../api/galleries";
import type { Photo } from "../../api/photos";
import Icon from "../Icon";

const statusLabel: Record<string, string> = { PENDING: "Очікує", DONE: "Оброблено" };

/** Відбори, які клієнти надіслали фотографу, + експорт назв файлів для Lightroom. */
export default function SelectionsPanel({ galleryId, photos }: { galleryId: string; photos: Photo[] }) {
  const [items, setItems] = useState<Selection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    setError(null);
    return galleriesApi
      .selections(galleryId)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Не вдалося завантажити відбори"));
  }, [galleryId]);

  useEffect(() => {
    load();
  }, [load]);

  // Якщо /export повернув помилку, збираємо назви файлів самі: за id фото з відбору та фото цієї галереї
  const localFilenames = (s: Selection): string[] => {
    if (s.filenames?.length) return s.filenames;
    const names = new Map(photos.map((p) => [p.id, p.filename]));
    return (s.photoIds ?? []).map((id) => names.get(id)).filter((n): n is string => !!n);
  };

  const copyForLightroom = async (s: Selection) => {
    setNote(null);
    let filenames: string[] = [];
    let serverError: string | null = null;
    try {
      filenames = (await galleriesApi.exportSelection(galleryId, s.id)).filenames;
    } catch (e) {
      serverError = e instanceof Error ? e.message : "помилка";
    }
    if (filenames.length === 0) filenames = localFilenames(s);

    if (filenames.length === 0) {
      setNote({
        ok: false,
        text: serverError
          ? `Сервер не зміг підготувати список (${serverError}), а у даних відбору немає інформації про фото, щоб зібрати його на сторінці.`
          : "У цьому відборі немає фото для експорту.",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(filenames.join(", "));
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 2500);
      if (serverError) setNote({ ok: true, text: `Список скопійовано (${filenames.length}). Сервер повернув помилку експорту («${serverError}»), тому назви зібрано на сторінці.` });
    } catch {
      setNote({ ok: false, text: "Браузер не дозволив скопіювати в буфер обміну." });
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
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-3xl text-[#4d1020]">Відбори клієнтів</h2>
          <button onClick={load} className="button border border-[#d8c7bd] text-[#6e605a]">Оновити</button>
        </div>
        {note && <p role="alert" className={`mt-4 rounded-xl px-4 py-3 text-sm ${note.ok ? "bg-[#2f6b3f]/10 text-[#2f6b3f]" : "bg-[#71142a]/10 text-[#71142a]"}`}>{note.text}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">{error}</p>}
        {!error && items === null && <p className="mt-4 text-sm text-[#766961]">Завантаження…</p>}
        {items?.length === 0 && <p className="mt-4 text-sm text-[#766961]">Клієнти ще не надсилали відбір.</p>}

        {items && items.length > 0 && (
          <ul className="mt-6 divide-y divide-[#dccdc4] overflow-hidden rounded-[24px] border border-[#ddcfc6] bg-[#f8f1eb]">
            {items.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 p-5 sm:px-8">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-2xl text-[#4d1020]">{s.clientName}</p>
                  <p className="mt-1 text-xs text-[#766961]">Фото: {s.photoCount}{s.status ? ` · ${statusLabel[s.status] ?? s.status}` : ""}{s.clientEmail ? ` · ${s.clientEmail}` : ""}</p>
                  {s.comment && <p className="mt-2 text-sm text-[#4d3b36]">«{s.comment}»</p>}
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
