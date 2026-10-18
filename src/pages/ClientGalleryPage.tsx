import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { clientApi } from "../api/clientGallery";
import type { ClientGallery, ClientPhoto } from "../api/clientGallery";
import { isPending } from "../api/photos";
import Icon from "../components/Icon";
import Lightbox from "../components/Lightbox";
import Logo from "../components/Logo";

const inputClass =
  "mt-2 w-full rounded-xl border border-[#d8c7bd] bg-white px-4 py-3 text-sm text-[#2a211e] outline-none transition focus:border-[#71142a] focus:ring-2 focus:ring-[#71142a]/20";

/** Публічна сторінка клієнта: /g/:token — перегляд, вибране, фінальний відбір, скачування. */
export default function ClientGalleryPage() {
  const { token = "" } = useParams();
  const [gallery, setGallery] = useState<ClientGallery | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await clientApi.get(token);
      setGallery(data);
      setFavorites(new Set(data.photos.filter((p) => p.favorite).map((p) => p.id)));
      setLocked(false);
      setError(null);
    } catch (e) {
      // 401/403 — галерея захищена PIN-кодом (або недоступна): показуємо форму розблокування
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setLocked(true);
      else setError(e instanceof Error ? e.message : "Не вдалося завантажити галерею");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const unlock = async (e: FormEvent) => {
    e.preventDefault();
    setPinError(null);
    try {
      await clientApi.lock(token, pin);
      await load();
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Невірний PIN-код");
    }
  };

  const settings = gallery?.settings;
  const expired = !!settings?.expiresAt && new Date(settings.expiresAt) < new Date();
  const maxCount = settings?.maxSelectionCount ?? null;
  const selectionAllowed = !!gallery && settings?.allowSelection !== false;
  const selectionOpen = selectionAllowed && !settings?.isSelectionLocked;

  const toggleFavorite = async (photo: ClientPhoto) => {
    if (!selectionOpen) return;
    const next = !favorites.has(photo.id);
    if (next && maxCount && favorites.size >= maxCount) {
      alert(`Ліміт відбору — ${maxCount} фото`);
      return;
    }
    const apply = (value: boolean) =>
      setFavorites((cur) => {
        const set = new Set(cur);
        value ? set.add(photo.id) : set.delete(photo.id);
        return set;
      });
    apply(next); // оптимістично, відкочуємо при помилці
    try {
      await clientApi.favorite(token, photo.id, next);
    } catch {
      apply(!next);
    }
  };

  const downloadAll = async () => {
    if (!gallery) return;
    setDownloading(true);
    try {
      await clientApi.download(gallery.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не вдалося підготувати архів");
    } finally {
      setDownloading(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-[#f7f0e9] text-[#2a211e]">{children}</main>
  );

  if (locked) {
    return shell(
      <div className="grid min-h-screen place-items-center bg-[#3d0d1a] px-5">
        <form onSubmit={unlock} className="w-full max-w-[420px] rounded-[24px] bg-[#f7f0e9] p-8 shadow-[0_30px_80px_rgba(39,5,14,.4)] sm:p-10">
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-full border border-[#cba9a0] text-[#711429]"><Icon name="lock" size={21} /></span>
          <h1 className="font-serif text-4xl text-[#4d1020]">Галерея захищена</h1>
          <p className="mt-2 text-sm text-[#766961]">Введіть PIN-код, який надіслав вам фотограф.</p>
          <label className="mt-6 block text-xs font-medium text-[#6e605a]">PIN-код
            <input className={inputClass} value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" autoComplete="off" required />
          </label>
          {pinError && <p role="alert" className="mt-4 rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">{pinError}</p>}
          <button type="submit" className="button mt-6 w-full bg-[#561124] text-white">Відкрити галерею</button>
        </form>
      </div>,
    );
  }

  if (error) {
    return shell(<p role="alert" className="mx-auto max-w-[600px] px-5 py-32 text-center text-sm text-[#71142a]">{error}</p>);
  }
  if (!gallery) {
    return shell(<p className="px-5 py-32 text-center text-sm text-[#766961]">Завантаження…</p>);
  }
  if (expired) {
    return shell(<p role="alert" className="mx-auto max-w-[600px] px-5 py-32 text-center text-sm text-[#71142a]">Термін дії цієї галереї минув. Зверніться до фотографа.</p>);
  }

  const downloadEnabled = gallery.settings.downloadEnabled !== false;
  const viewable = gallery.photos.filter((p) => p.url);
  const previewIndex = viewable.findIndex((p) => p.id === previewId);

  return shell(
    <>
      <header className="bg-[#3d0d1a] text-white">
        <div className="mx-auto flex max-w-[1340px] flex-col gap-8 px-5 pb-14 pt-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[760px]">
            <Logo light />
            <h1 className="mt-14 font-serif text-[44px] font-medium leading-[0.95] tracking-[-0.025em] sm:text-[64px]">{gallery.title}</h1>
            {gallery.photographer?.name && <p className="mt-4 text-sm text-white/70">Фотограф: {gallery.photographer.name}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectionAllowed && (
              <span className="text-sm text-white/75">
                {gallery.settings.isSelectionLocked ? "Відбір закрито · " : ""}Обрано: {favorites.size}{maxCount ? ` / ${maxCount}` : ` з ${gallery.photos.length}`}
              </span>
            )}
            {downloadEnabled && (
              <button onClick={downloadAll} disabled={downloading} className="button button-ghost disabled:opacity-60">
                <Icon name="download" size={16} /> {downloading ? "Готуємо…" : "Скачати все"}
              </button>
            )}
            {selectionAllowed && (
              <button onClick={() => setSubmitOpen(true)} disabled={!selectionOpen || favorites.size === 0 || submitted} className="button button-blush disabled:opacity-50">
                {submitted ? "Відбір надіслано" : "Надіслати відбір"} <Icon name="arrow" size={17} />
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="bg-[#211a18] py-16 text-white sm:py-20">
        <div className="mx-auto max-w-[1340px] px-5 sm:px-8">
          {gallery.photos.length === 0 && <p className="text-center text-sm text-white/60">У галереї ще немає фото.</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            {gallery.photos.map((photo) => (
              <article key={photo.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-[#3a2f2b]">
                {photo.url ? (
                  <button type="button" onClick={() => setPreviewId(photo.id)} className="absolute inset-0 block h-full w-full" aria-label={`Переглянути фото ${photo.filename}`}>
                    <img src={photo.thumbUrl || photo.url} alt={photo.filename} loading="lazy" draggable={false} onContextMenu={(e) => e.preventDefault()} className="h-full w-full select-none object-cover transition duration-700 group-hover:scale-105" />
                  </button>
                ) : (
                  <div className="grid h-full place-items-center text-xs text-white/50">{isPending(photo) ? "Обробляється…" : "Немає адреси фото"}</div>
                )}
                {selectionAllowed && <button onClick={() => toggleFavorite(photo)} disabled={!selectionOpen} aria-pressed={favorites.has(photo.id)} aria-label="Додати фото до обраних" className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition ${favorites.has(photo.id) ? "bg-[#711329] text-white" : "bg-white/85 text-[#661225]"}`}>
                  <Icon name="heart" size={16} />
                </button>}
              </article>
            ))}
          </div>
        </div>
      </section>

      {previewIndex >= 0 && (
        <Lightbox
          photos={viewable}
          index={previewIndex}
          onChange={(i) => setPreviewId(viewable[i].id)}
          onClose={() => setPreviewId(null)}
          watermarkText={null}
          renderActions={(photo) => (
            <>
              {selectionAllowed && <button onClick={() => toggleFavorite(photo as ClientPhoto)} disabled={!selectionOpen} aria-pressed={favorites.has(photo.id)} aria-label="Додати фото до обраних" className={`grid h-10 w-10 place-items-center rounded-full transition ${favorites.has(photo.id) ? "bg-[#711329] text-white" : "bg-white/10 hover:bg-white/20"}`}>
                <Icon name="heart" size={18} />
              </button>}
              {downloadEnabled && (
                <button onClick={() => window.open(clientApi.photoDownloadUrl(gallery.id, photo.id), "_blank")} aria-label="Скачати фото" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
                  <Icon name="download" size={18} />
                </button>
              )}
            </>
          )}
        />
      )}

      {submitOpen && (
        <SubmitModal
          galleryId={gallery.id}
          photoIds={[...favorites]}
          onClose={() => setSubmitOpen(false)}
          onDone={() => { setSubmitted(true); setSubmitOpen(false); }}
        />
      )}
    </>,
  );
}

function SubmitModal({ galleryId, photoIds, onClose, onDone }: { galleryId: string; photoIds: string[]; onClose: () => void; onDone: () => void }) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await clientApi.submitSelection(galleryId, { clientName, clientEmail, photoIds, comment: comment || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося надіслати відбір");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#27050e]/70 px-5 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="submit-title" className="w-full max-w-[460px] rounded-[24px] bg-[#f7f0e9] p-8 shadow-[0_30px_80px_rgba(39,5,14,.4)] sm:p-10">
        <h2 id="submit-title" className="font-serif text-4xl text-[#4d1020]">Надіслати відбір</h2>
        <p className="mt-2 text-sm text-[#766961]">Фото у відборі: {photoIds.length}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-xs font-medium text-[#6e605a]">Ваше ім’я
            <input className={inputClass} value={clientName} onChange={(e) => setClientName(e.target.value)} required />
          </label>
          <label className="block text-xs font-medium text-[#6e605a]">Email
            <input className={inputClass} type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required />
          </label>
          <label className="block text-xs font-medium text-[#6e605a]">Коментар до ретуші
            <textarea className={inputClass} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Наприклад: зробіть тепліше" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="button flex-1 border border-[#d8c7bd] text-[#6e605a]">Скасувати</button>
            <button type="submit" disabled={submitting} className="button flex-1 bg-[#561124] text-white disabled:opacity-60">{submitting ? "Надсилаємо…" : "Надіслати"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
