import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { galleriesApi } from "../api/galleries";
import type { GalleryListItem, GalleryStatus } from "../api/galleries";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";

const statusLabel: Record<GalleryStatus, string> = {
  DRAFT: "Чернетка",
  ACTIVE: "Опубліковано",
  ARCHIVED: "Архів",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-[#d8c7bd] bg-white px-4 py-3 text-sm text-[#2a211e] outline-none transition focus:border-[#71142a] focus:ring-2 focus:ring-[#71142a]/20";

export default function DashboardPage() {
  const [galleries, setGalleries] = useState<GalleryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    galleriesApi
      .list()
      .then(setGalleries)
      .catch((e) => setError(e instanceof Error ? e.message : "Не вдалося завантажити галереї"));
  }, []);

  const handleDelete = async (gallery: GalleryListItem) => {
    if (!confirm(`Видалити галерею «${gallery.title}» разом з усіма фото?`)) return;
    try {
      await galleriesApi.remove(gallery.id);
      setGalleries((current) => current?.filter((g) => g.id !== gallery.id) ?? null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не вдалося видалити галерею");
    }
  };

  return (
    <AppShell
      eyebrow="Кабінет фотографа"
      title={<>Ваші <em className="font-normal text-[#edc9c0]">галереї</em></>}
      subtitle={galleries ? `Галерей: ${galleries.length}. Створюйте нові та діліться зйомками з клієнтами.` : undefined}
      actions={
        <button onClick={() => setCreating(true)} className="button button-blush">
          <Icon name="plus" size={17} /> Нова галерея
        </button>
      }
    >
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          {error && <p role="alert" className="rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">{error}</p>}

          {!error && galleries === null && <p className="text-sm text-[#766961]">Завантаження…</p>}

          {galleries?.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[#cdb9ae] p-12 text-center sm:p-16">
              <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-[#cba9a0] text-[#711429]"><Icon name="image" size={21} /></span>
              <p className="font-serif text-3xl text-[#4d1020]">Тут поки порожньо</p>
              <p className="mt-2 text-sm text-[#766961]">Створіть першу галерею, щоб поділитися зйомкою з клієнтом.</p>
              <button onClick={() => setCreating(true)} className="button mt-7 bg-[#561124] text-white">
                <Icon name="plus" size={17} /> Нова галерея
              </button>
            </div>
          )}

          {galleries && galleries.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {galleries.map((gallery) => (
                <article key={gallery.id} className="group overflow-hidden rounded-[24px] border border-[#ddcfc6] bg-[#f8f1eb] transition hover:bg-[#fffaf5]">
                  <Link to={`/dashboard/galleries/${gallery.id}`} className="relative block aspect-[4/3] overflow-hidden bg-[#e6d9d0]">
                    {gallery.coverUrl ? (
                      <img src={gallery.coverUrl} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full place-items-center text-[#b5a39a]"><Icon name="image" size={34} /></div>
                    )}
                    <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] uppercase tracking-[.15em] ${gallery.status === "ACTIVE" ? "bg-[#561124] text-white" : "bg-white/90 text-[#6e605a]"}`}>
                      {statusLabel[gallery.status] ?? gallery.status}
                    </span>
                  </Link>
                  <div className="flex items-center justify-between gap-3 p-6">
                    <Link to={`/dashboard/galleries/${gallery.id}`} className="min-w-0">
                      <h2 className="truncate font-serif text-2xl text-[#4d1020]">{gallery.title}</h2>
                    </Link>
                    <button onClick={() => handleDelete(gallery)} className="shrink-0 rounded-full p-2 text-[#8d7a71] transition hover:bg-[#71142a]/10 hover:text-[#71142a]" aria-label={`Видалити галерею ${gallery.title}`}>
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {creating && (
        <CreateGalleryModal
          onClose={() => setCreating(false)}
          onCreated={(gallery) => setGalleries((current) => [gallery, ...(current ?? [])])}
        />
      )}
    </AppShell>
  );
}

function CreateGalleryModal({ onClose, onCreated }: { onClose: () => void; onCreated: (g: GalleryListItem) => void }) {
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
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
      const created = await galleriesApi.create({
        title,
        clientName: clientName || undefined,
        date: date || undefined,
        location: location || undefined,
        status: "DRAFT",
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося створити галерею");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#27050e]/70 px-5 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="create-title" className="w-full max-w-[460px] rounded-[24px] bg-[#f7f0e9] p-8 shadow-[0_30px_80px_rgba(39,5,14,.4)] sm:p-10">
        <p className="eyebrow">Нова зйомка</p>
        <h2 id="create-title" className="font-serif text-4xl text-[#4d1020]">Нова <em>галерея</em></h2>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-xs font-medium text-[#6e605a]">Назва
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Весілля Анни та Джона" required />
          </label>
          <label className="block text-xs font-medium text-[#6e605a]">Ім’я клієнта
            <input className={inputClass} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Anna & John" />
          </label>
          <label className="block text-xs font-medium text-[#6e605a]">Дата зйомки
            <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block text-xs font-medium text-[#6e605a]">Локація
            <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Париж" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="button flex-1 justify-center border border-[#d8c7bd] text-[#6e605a]">Скасувати</button>
            <button type="submit" disabled={submitting} className="button flex-1 justify-center bg-[#561124] text-white disabled:opacity-60">{submitting ? "Створюємо…" : "Створити"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
