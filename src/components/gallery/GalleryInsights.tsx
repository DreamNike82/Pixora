import { useEffect, useState } from "react";
import { buildUpdate, galleriesApi } from "../../api/galleries";
import type { Analytics, GalleryDetails } from "../../api/galleries";
import { ApiError } from "../../api/client";
import Icon from "../Icon";

type Props = {
  gallery: GalleryDetails;
  published: boolean;
  onChange: (patch: Partial<GalleryDetails>) => void;
};

/** Посилання для клієнта, налаштування скачування (PATCH settings.downloadEnabled), ZIP і статистика. */
export default function GalleryInsights({ gallery, published, onChange }: Props) {
  const [stats, setStats] = useState<Analytics | null>(null);
  const [copied, setCopied] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [downloadEnabled, setDownloadEnabled] = useState(gallery.settings.downloadEnabled ?? true);

  useEffect(() => {
    galleriesApi.analytics(gallery.id).then(setStats).catch(() => {});
  }, [gallery.id]);

  const link = gallery.accessToken ? `${window.location.origin}/g/${gallery.accessToken}` : null;

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = buildUpdate(gallery, { downloadEnabled });
      // Документація: settings.downloadEnabled. На бекенді поле може бути плоским allowDownload — шлемо обидва;
      // якщо сервер відхилить зайвий ключ, повторюємо лише з документованим форматом.
      try {
        await galleriesApi.update(gallery.id, { ...body, allowDownload: downloadEnabled });
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 400) throw e;
        await galleriesApi.update(gallery.id, body);
      }
      // Перевіряємо, що сервер справді зберіг значення (а не проігнорував поле)
      const fresh = await galleriesApi.get(gallery.id);
      onChange({ settings: fresh.settings });
      if ((fresh.settings.downloadEnabled ?? true) !== downloadEnabled) {
        setMessage({ ok: false, text: `Сервер прийняв запит, але значення не змінилося. Поля у відповіді сервера: ${fresh.rawKeys?.join(", ")}.` });
      } else {
        setMessage({ ok: true, text: "Налаштування збережено" });
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Не вдалося зберегти налаштування" });
    } finally {
      setSaving(false);
    }
  };

  const downloadZip = async () => {
    setZipBusy(true);
    setMessage(null);
    try {
      await galleriesApi.downloadZip(gallery.id);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Не вдалося підготувати архів" });
    } finally {
      setZipBusy(false);
    }
  };

  const numbers: [string, number | undefined][] = [
    ["Переглядів", stats?.views],
    ["Скачувань", stats?.downloads],
    ["Обраних", stats?.favorites],
  ];

  return (
    <section className="pt-20 sm:pt-24">
      <div className="mx-auto grid max-w-[1240px] gap-5 px-5 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[24px] border border-[#ddcfc6] bg-[#f8f1eb] p-7 sm:p-9">
          <h2 className="font-serif text-3xl text-[#4d1020]">Доступ для клієнта</h2>

          {!published ? (
            <p className="mt-3 text-sm leading-6 text-[#766961]">Опублікуйте галерею, щоб клієнт міг відкрити її за посиланням.</p>
          ) : link ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-xl border border-[#d8c7bd] bg-white px-4 py-3 text-sm text-[#2a211e]" aria-label="Посилання для клієнта" />
              <button onClick={copyLink} className="button shrink-0 bg-[#561124] text-white">
                <Icon name={copied ? "check" : "link"} size={16} /> {copied ? "Скопійовано" : "Копіювати"}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#766961]">API не повернув accessToken, тому посилання для клієнта сформувати не вдалося.</p>
          )}

          <div className="mt-7">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-[#4d3b36]">
              <input type="checkbox" checked={downloadEnabled} onChange={(e) => setDownloadEnabled(e.target.checked)} className="h-4 w-4 accent-[#71142a]" />
              Дозволити клієнту скачувати фото
            </label>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button onClick={save} disabled={saving} className="button bg-[#561124] text-white disabled:opacity-60">{saving ? "Зберігаємо…" : "Зберегти налаштування"}</button>
            <button onClick={downloadZip} disabled={zipBusy} className="button border border-[#d8c7bd] text-[#6e605a] disabled:opacity-60">
              <Icon name="download" size={16} /> {zipBusy ? "Готуємо архів…" : "Скачати все (ZIP)"}
            </button>
          </div>
          {message && <p role="alert" className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-[#2f6b3f]/10 text-[#2f6b3f]" : "bg-[#71142a]/10 text-[#71142a]"}`}>{message.text}</p>}
        </div>

        <div className="grid grid-cols-3 gap-px self-start overflow-hidden rounded-[24px] border border-[#d9c9bf] bg-[#d9c9bf]">
          {numbers.map(([label, value]) => (
            <div key={label} className="flex flex-col justify-center bg-[#f8f1eb] p-5 text-center">
              <p className="font-serif text-4xl text-[#4d1020]">{value ?? "—"}</p>
              <p className="mt-1 text-xs text-[#766961]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
