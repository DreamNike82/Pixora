import { useEffect, useState } from "react";
import { galleriesApi } from "../../api/galleries";
import type { Analytics, GalleryDetails, GallerySettings } from "../../api/galleries";
import Icon from "../Icon";

type Props = {
  gallery: GalleryDetails;
  published: boolean;
  onChange: (patch: Partial<GalleryDetails>) => void;
};

const inputClass = "mt-2 w-full rounded-xl border border-[#d8c7bd] bg-white px-4 py-3 text-sm text-[#2a211e] outline-none transition focus:border-[#71142a] focus:ring-2 focus:ring-[#71142a]/20";

const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");

/** Посилання для клієнта, налаштування галереї (одним PATCH), ZIP і статистика. */
export default function GalleryInsights({ gallery, published, onChange }: Props) {
  const [stats, setStats] = useState<Analytics | null>(null);
  const [copied, setCopied] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Локальна копія налаштувань: зберігаємо кнопкою, а не на кожен клік
  const st = gallery.settings;
  const opacity01 = st.watermarkOpacity == null ? 0.4 : st.watermarkOpacity > 1 ? st.watermarkOpacity / 100 : st.watermarkOpacity;
  const [form, setForm] = useState({
    downloadEnabled: st.downloadEnabled ?? true,
    allowSelection: st.allowSelection ?? true,
    isSelectionLocked: st.isSelectionLocked ?? false,
    maxSelectionCount: st.maxSelectionCount ? String(st.maxSelectionCount) : "",
    expiresAt: toDateInput(st.expiresAt),
    watermarkEnabled: st.watermarkEnabled ?? true,
    watermarkText: st.watermarkText ?? "",
    watermarkOpacity: String(Math.round(opacity01 * 100)),
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

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
    // 1) Документований контракт: PATCH { settings: { downloadEnabled } }
    // 2) Розширені налаштування (їх немає в API_DOCS.md) — окремим запитом, щоб їхня відмова не зламала основне
    const extended: GallerySettings = {
      allowSelection: form.allowSelection,
      isSelectionLocked: form.isSelectionLocked,
      maxSelectionCount: form.maxSelectionCount ? Math.max(1, Number(form.maxSelectionCount)) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      watermarkEnabled: form.watermarkEnabled,
      watermarkText: form.watermarkText.trim() || null,
      watermarkOpacity: Math.min(100, Math.max(5, Number(form.watermarkOpacity) || 40)) / 100,
    };
    setSaving(true);
    setMessage(null);
    try {
      await galleriesApi.update(gallery.id, { settings: { downloadEnabled: form.downloadEnabled } });
      onChange({ settings: { ...gallery.settings, downloadEnabled: form.downloadEnabled } });
      try {
        await galleriesApi.update(gallery.id, { settings: { downloadEnabled: form.downloadEnabled, ...extended } });
        onChange({ settings: { ...gallery.settings, downloadEnabled: form.downloadEnabled, ...extended } });
        setMessage({ ok: true, text: "Налаштування збережено" });
      } catch (e) {
        setMessage({ ok: false, text: `Скачування збережено, але розширені налаштування сервер не прийняв: ${e instanceof Error ? e.message : "помилка"}` });
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
      const { downloadUrl } = await galleriesApi.downloadZip(gallery.id);
      window.location.href = downloadUrl;
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

  const check = (key: "downloadEnabled" | "allowSelection" | "isSelectionLocked" | "watermarkEnabled", label: string) => (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-[#4d3b36]">
      <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} className="h-4 w-4 accent-[#71142a]" />
      {label}
    </label>
  );

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

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {check("downloadEnabled", "Дозволити скачування")}
            {check("allowSelection", "Дозволити вибір фото")}
            {check("isSelectionLocked", "Закрити відбір (клієнт уже обрав)")}
            {check("watermarkEnabled", "Водяний знак на фото")}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[#6e605a]">Ліміт фото у відборі
              <input className={inputClass} type="number" min={1} value={form.maxSelectionCount} onChange={(e) => set("maxSelectionCount", e.target.value)} placeholder="Без ліміту" />
            </label>
            <label className="block text-xs font-medium text-[#6e605a]">Посилання діє до
              <input className={inputClass} type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
            </label>
            <label className="block text-xs font-medium text-[#6e605a]">Текст водяного знака
              <input className={inputClass} value={form.watermarkText} onChange={(e) => set("watermarkText", e.target.value)} placeholder="Ім’я з профілю" disabled={!form.watermarkEnabled} />
            </label>
            <label className="block text-xs font-medium text-[#6e605a]">Прозорість знака: {form.watermarkOpacity}%
              <input className="mt-4 w-full accent-[#71142a]" type="range" min={5} max={100} step={5} value={form.watermarkOpacity} onChange={(e) => set("watermarkOpacity", e.target.value)} disabled={!form.watermarkEnabled} />
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
