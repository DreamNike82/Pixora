import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { buildUpdate, galleriesApi } from "../api/galleries";
import type { GalleryDetails, GalleryStatus, Section } from "../api/galleries";
import { isPending, photosApi } from "../api/photos";
import type { Photo } from "../api/photos";
import { profileApi } from "../api/profile";
import type { Profile } from "../api/profile";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import Lightbox from "../components/Lightbox";
import Watermark from "../components/Watermark";
import GalleryInsights from "../components/gallery/GalleryInsights";
import SelectionsPanel from "../components/gallery/SelectionsPanel";

type UploadItem = { id: string; name: string; status: "uploading" | "error"; error?: string };

const MAX_PARALLEL = 3;

export default function GalleryPage() {
  const { id = "" } = useParams();
  const [gallery, setGallery] = useState<GalleryDetails | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [uploadSection, setUploadSection] = useState(""); // розділ, у який потрапляють нові фото
  const [filter, setFilter] = useState("all");
  const [newSection, setNewSection] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null); // помилки показуємо на сторінці, а не через alert
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await galleriesApi.get(id);
      setGallery(data);
      setPhotos(data.photos ?? []);
      setSections(data.sections ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити галерею");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Фото після S3-завантаження обробляються асинхронно (url з'являється пізніше) — підтягуємо оновлення
  const missingUrl = photos.filter((p) => !p.url);
  const hasPending = missingUrl.some(isPending);
  useEffect(() => {
    if (!hasPending) return;
    let attempts = 0;
    const timer = setInterval(() => {
      if (++attempts > 20) return clearInterval(timer);
      load();
    }, 4000);
    return () => clearInterval(timer);
  }, [hasPending, load]);

  // Фото без адреси ставимо в обробку (POST .../photos/process) — по одному разу на фото
  const processed = useRef<Set<string>>(new Set());
  useEffect(() => {
    const fresh = missingUrl.map((p) => p.id).filter((pid) => !processed.current.has(pid));
    if (fresh.length === 0) return;
    fresh.forEach((pid) => processed.current.add(pid));
    photosApi.process(id, fresh).catch(() => {});
  }, [missingUrl, id]);

  // Текст і налаштування водяного знака беремо з профілю фотографа
  useEffect(() => {
    profileApi
      .get()
      .then((p) => {
        setProfile(p);
      })
      .catch(() => {});
  }, []);

  const uploadFiles = async (selected: File[]) => {
    const files = selected.filter((f) => f.type === "image/jpeg" || f.type === "image/png");
    if (files.length < selected.length) alert("Підтримуються лише JPEG і PNG. Інші файли пропущено.");
    if (files.length === 0) return;

    const jobs = files.map((file) => ({ file, id: crypto.randomUUID() }));
    setUploads((cur) => [...cur, ...jobs.map((j) => ({ id: j.id, name: j.file.name, status: "uploading" as const }))]);

    const queue = [...jobs];
    const worker = async () => {
      while (queue.length > 0) {
        const job = queue.shift()!;
        try {
          const photo = await photosApi.upload(id, job.file, uploadSection || undefined);
          setPhotos((cur) => [...cur, photo]);
          setUploads((cur) => cur.filter((u) => u.id !== job.id));
        } catch (e) {
          const message = e instanceof Error ? e.message : "Помилка завантаження";
          setUploads((cur) => cur.map((u) => (u.id === job.id ? { ...u, status: "error", error: message } : u)));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL, jobs.length) }, worker));
    load(); // підтягуємо актуальні url з сервера
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const deletePhoto = async (photo: Photo) => {
    if (!confirm(`Видалити фото «${photo.filename}»?`)) return;
    try {
      await photosApi.remove(id, photo.id);
      setPhotos((cur) => cur.filter((p) => p.id !== photo.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не вдалося видалити фото");
    }
  };

  const addSection = async () => {
    const name = newSection.trim();
    if (!name) return;
    try {
      const section = await galleriesApi.createSection(id, name);
      setSections((cur) => [...cur, section]);
      setUploadSection(section.id);
      setNewSection("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не вдалося створити розділ");
    }
  };

  // POST .../photos/process { photoIds } — сервер накладає водяний знак (зі знака в профілі, якщо watermarkEnabled) і робить ресайз
  const applyWatermark = async () => {
    const ids = selectMode && selected.size > 0 ? [...selected] : photos.map((p) => p.id);
    if (ids.length === 0) return;
    setProcessing(true);
    setInfo(null);
    setNotice(null);
    try {
      const job = await photosApi.process(id, ids);
      setInfo(`Обробку запущено для ${ids.length} фото${job?.status ? ` (${job.status})` : ""}. Оновлюємо галерею…`);
      setTimeout(load, 3000);
      setTimeout(load, 10000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "невідома помилка";
      setNotice(
        /origin/i.test(msg)
          ? `Не вдалося запустити обробку: сервер відхилив запит (${msg}). Власнику бекенду потрібно додати ${window.location.origin} до дозволених origin — доки цього не зроблено, водяні знаки не накладаються.`
          : `Не вдалося запустити обробку: ${msg}`,
      );
    } finally {
      setProcessing(false);
    }
  };

  // PATCH /api/admin/galleries/[id] { coverUrl }
  const setCover = async (photo: Photo) => {
    setNotice(null);
    try {
      await galleriesApi.update(id, buildUpdate(gallery!, { coverUrl: photo.url }));
      setGallery((g) => (g ? { ...g, coverUrl: photo.url } : g));
    } catch (e) {
      setNotice(`Не вдалося змінити обкладинку: ${e instanceof Error ? e.message : "невідома помилка"}`);
    }
  };

  const toggleSelected = (photoId: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      next.has(photoId) ? next.delete(photoId) : next.add(photoId);
      return next;
    });

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const deleteSelected = async () => {
    if (selected.size === 0 || !confirm(`Видалити вибрані фото (${selected.size})?`)) return;
    try {
      await photosApi.batchRemove(id, [...selected]);
      setPhotos((cur) => cur.filter((p) => !selected.has(p.id)));
      exitSelectMode();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не вдалося видалити фото");
    }
  };

  const status: GalleryStatus = gallery?.status ?? "DRAFT";

  const togglePublish = async () => {
    const next: GalleryStatus = status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    setPublishing(true);
    setNotice(null);
    try {
      await galleriesApi.update(id, buildUpdate(gallery!, { status: next }));
      // Перечитуємо галерею: так видно, що статус справді змінився на сервері
      const fresh = await galleriesApi.get(id);
      setGallery(fresh);
      if (fresh.status !== next) {
        setNotice(`Сервер прийняв запит, але статус залишився «${fresh.status ?? "невідомо"}».`);
      }
    } catch (e) {
      setNotice(`Не вдалося змінити статус: ${e instanceof Error ? e.message : "невідома помилка"}`);
    } finally {
      setPublishing(false);
    }
  };

  const published = status === "ACTIVE";

  // У перегляд потрапляють лише фото, у яких уже є url (необроблені пропускаємо)
  const visiblePhotos = filter === "all" ? photos : photos.filter((p) => p.sectionId === filter);
  const viewable = visiblePhotos.filter((p) => p.url);
  const previewIndex = viewable.findIndex((p) => p.id === previewId);
  // Налаштування водяного знака беремо з галереї, а якщо їх там немає — з профілю
  const watermark = gallery?.settings.watermarkEnabled ?? profile?.watermarkEnabled ?? true;
  const watermarkText = gallery?.settings.watermarkText || profile?.name || "PIXORA";
  const rawOpacity = gallery?.settings.watermarkOpacity;
  const watermarkOpacity = rawOpacity == null ? undefined : rawOpacity > 1 ? rawOpacity / 100 : rawOpacity;

  return (
    <AppShell
      eyebrow={gallery ? `${published ? "Опубліковано" : "Чернетка"} · ${photos.length} фото` : "Галерея"}
      title={gallery ? gallery.title : "Завантаження…"}
      subtitle={gallery ? [gallery.clientName, gallery.date && new Date(gallery.date).toLocaleDateString("uk-UA"), gallery.location].filter(Boolean).join(" · ") || undefined : undefined}
      actions={
        <>
          <Link to="/dashboard" className="button button-ghost">← Усі галереї</Link>
          {gallery && (
            <button onClick={togglePublish} disabled={publishing} className={`button disabled:opacity-60 ${published ? "button-ghost" : "button-blush"}`}>
              {published ? "Зняти з публікації" : "Опублікувати"}
            </button>
          )}
        </>
      }
    >
      {error && (
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
            <p role="alert" className="rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">{error}</p>
          </div>
        </section>
      )}

      {!error && !gallery && (
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-[1240px] px-5 sm:px-8"><p className="text-sm text-[#766961]">Завантаження…</p></div>
        </section>
      )}

      {gallery && (
        <>
          {info && (
            <div className="mx-auto mt-8 max-w-[1240px] px-5 sm:px-8">
              <p role="status" className="rounded-xl bg-[#2f6b3f]/10 px-4 py-3 text-sm text-[#2f6b3f]">{info}</p>
            </div>
          )}
          {notice && (
            <div className="mx-auto mt-8 max-w-[1240px] px-5 sm:px-8">
              <p role="alert" className="rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">{notice}</p>
            </div>
          )}
          {missingUrl.length > 0 && !hasPending && (
            <div className="mx-auto mt-8 max-w-[1240px] px-5 sm:px-8">
              <p role="alert" className="rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">
                Сервер не повернув адресу зображення для {missingUrl.length} фото. Поля у його відповіді: {missingUrl[0].rawKeys?.join(", ")}.
              </p>
            </div>
          )}
          <GalleryInsights gallery={gallery} published={published} onChange={(patch) => setGallery((g) => (g ? { ...g, ...patch } : g))} />

          <section className="py-20 sm:py-24">
            <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block flex-1 text-xs font-medium text-[#6e605a]">Розділ для нових фото
                  <select value={uploadSection} onChange={(e) => setUploadSection(e.target.value)} className="mt-2 w-full rounded-xl border border-[#d8c7bd] bg-white px-4 py-3 text-sm text-[#2a211e]">
                    <option value="">Без розділу</option>
                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <div className="flex flex-1 gap-2">
                  <input value={newSection} onChange={(e) => setNewSection(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSection()} placeholder="Новий розділ, напр. «Ранок нареченої»" className="w-full rounded-xl border border-[#d8c7bd] bg-white px-4 py-3 text-sm text-[#2a211e]" aria-label="Назва нового розділу" />
                  <button onClick={addSection} className="button shrink-0 border border-[#d8c7bd] text-[#6e605a]"><Icon name="plus" size={16} /> Додати</button>
                </div>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`rounded-[24px] border-2 border-dashed p-10 text-center transition sm:p-14 ${dragging ? "border-[#71142a] bg-[#71142a]/5" : "border-[#cdb9ae] bg-[#f8f1eb]"}`}
              >
                <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full border border-[#cba9a0] text-[#711429]"><Icon name="image" size={21} /></span>
                <p className="font-serif text-3xl text-[#4d1020]">Перетягніть фото сюди</p>
                <p className="mt-2 text-sm text-[#766961]">JPEG або PNG, можна вибрати одразу кілька</p>
                <button onClick={() => inputRef.current?.click()} className="button mt-7 bg-[#561124] text-white">
                  <Icon name="plus" size={17} /> Вибрати файли
                </button>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png" multiple hidden onChange={onPick} />
              </div>

              {uploads.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {uploads.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#ddcfc6] bg-[#f8f1eb] px-4 py-3 text-sm">
                      <span className="truncate">{u.name}</span>
                      {u.status === "uploading" ? (
                        <span className="shrink-0 text-[#766961]">Завантажується…</span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-3 text-[#71142a]">
                          {u.error}
                          <button onClick={() => setUploads((cur) => cur.filter((x) => x.id !== u.id))} aria-label="Закрити"><Icon name="close" size={15} /></button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {photos.length === 0 && uploads.length === 0 && (
                <p className="mt-10 text-center text-sm text-[#766961]">У галереї ще немає фото.</p>
              )}
            </div>
          </section>

          {photos.length > 0 && (
            <section className="bg-[#211a18] py-20 text-white sm:py-24">
              <div className="mx-auto max-w-[1340px] px-5 sm:px-8">
                <div>
                  <p className="eyebrow eyebrow-light">Ваша зйомка</p>
                  <h2 className="section-title section-title-light">Фото <em>галереї</em></h2>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="ml-auto flex flex-wrap gap-2">
                    {selectMode ? (
                      <>
                        <button onClick={deleteSelected} disabled={selected.size === 0} className="button button-blush disabled:opacity-50"><Icon name="trash" size={16} /> Видалити ({selected.size})</button>
                        <button onClick={exitSelectMode} className="button button-ghost">Скасувати</button>
                      </>
                    ) : (
                      <button onClick={() => setSelectMode(true)} className="button button-ghost">Вибрати кілька</button>
                    )}
                    <button onClick={applyWatermark} disabled={processing} className="button button-ghost disabled:opacity-50">
                      {processing ? "Запускаємо…" : selectMode && selected.size > 0 ? `Накласти водяний знак (${selected.size})` : "Накласти водяний знак"}
                    </button>
                  </div>
                </div>
                {sections.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Розділи галереї">
                    {[{ id: "all", name: "Усі" }, ...sections].map((sec) => (
                      <button key={sec.id} role="tab" aria-selected={filter === sec.id} onClick={() => setFilter(sec.id)} className={`rounded-full px-4 py-2 text-xs transition ${filter === sec.id ? "bg-[#e8beb5] text-[#511021]" : "border border-white/25 text-white/75 hover:bg-white/10"}`}>{sec.name}</button>
                    ))}
                  </div>
                )}
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                  {visiblePhotos.map((photo) => (
                    <article key={photo.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-[#3a2f2b]">
                      {photo.url ? (
                        <button type="button" onClick={() => (selectMode ? toggleSelected(photo.id) : setPreviewId(photo.id))} className="absolute inset-0 block h-full w-full" aria-label={`Переглянути фото ${photo.filename}`}>
                          <img src={photo.thumbUrl || photo.url} alt={photo.filename} loading="lazy" draggable={false} onContextMenu={(e) => e.preventDefault()} className="h-full w-full select-none object-cover transition duration-700 group-hover:scale-105" />
                          {watermark && <Watermark text={watermarkText} opacity={watermarkOpacity} scale={0.55} />}
                        </button>
                      ) : (
                        <div className="grid h-full place-items-center px-3 text-center text-xs text-white/50">{isPending(photo) ? "Обробляється…" : "Немає адреси фото"}</div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition group-hover:opacity-100" />
                      <p className="pointer-events-none absolute bottom-3 left-3 right-36 truncate text-xs text-white opacity-0 transition group-hover:opacity-100">{photo.filename}</p>
                      {selectMode && (
                        <span className={`pointer-events-none absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full border-2 ${selected.has(photo.id) ? "border-[#e8beb5] bg-[#e8beb5] text-[#511021]" : "border-white/80 bg-black/20 text-transparent"}`}><Icon name="check" size={14} /></span>
                      )}
                      {!selectMode && (
                        <button onClick={() => deletePhoto(photo)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-[#661225] opacity-0 backdrop-blur transition group-hover:opacity-100 focus:opacity-100" aria-label={`Видалити фото ${photo.filename}`}>
                        <Icon name="trash" size={16} />
                      </button>
                      )}
                      {!selectMode && photo.url && (
                        <button onClick={() => setCover(photo)} disabled={gallery.coverUrl === photo.url} className={`absolute bottom-3 right-3 rounded-full px-3 py-1.5 text-[11px] backdrop-blur transition focus:opacity-100 ${gallery.coverUrl === photo.url ? "bg-[#e8beb5] text-[#511021] opacity-100" : "bg-white/85 text-[#661225] opacity-0 group-hover:opacity-100"}`}>
                          {gallery.coverUrl === photo.url ? "Обкладинка" : "Зробити обкладинкою"}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
          <SelectionsPanel galleryId={id} photos={photos} />
        </>
      )}

      {previewIndex >= 0 && (
        <Lightbox
          photos={viewable}
          index={previewIndex}
          onChange={(i) => setPreviewId(viewable[i].id)}
          onClose={() => setPreviewId(null)}
          watermarkText={watermark ? watermarkText : null}
        />
      )}
    </AppShell>
  );
}
