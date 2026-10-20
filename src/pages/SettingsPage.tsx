import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { profileApi } from "../api/profile";
import type { BrandAssetType, Profile } from "../api/profile";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import { makeTextWatermark, prepareImage } from "../lib/image";

const inputClass =
  "mt-2 w-full rounded-xl border border-[#d8c7bd] bg-white px-4 py-3 text-sm text-[#2a211e] outline-none transition focus:border-[#71142a] focus:ring-2 focus:ring-[#71142a]/20";

const assets: { type: BrandAssetType; label: string; hint: string; required: boolean }[] = [
  { type: "avatar", label: "Аватар", hint: "Ваше фото", required: true },
  { type: "logo", label: "Логотип", hint: "Показується у галереях", required: true },
  { type: "watermark", label: "Водяний знак", hint: "Необов’язково. Без нього знаком буде ваш Instagram", required: false },
];

type Errors = Partial<Record<"name" | "instagram" | "avatar" | "logo", string>>;

// «https://instagram.com/ivan_photo/», «ivan_photo», «@ivan_photo» → «@ivan_photo»
const normalizeInstagram = (v: string) => {
  const handle = v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@+/, "");
  return handle ? `@${handle}` : "";
};

const Required = () => <span className="text-[#71142a]"> *</span>;
const FieldError = ({ text }: { text?: string }) => (text ? <span className="mt-1 block text-xs text-[#71142a]">{text}</span> : null);

export default function SettingsPage() {
  const [form, setForm] = useState<Profile>({ name: "", bio: "", instagram: "", watermarkEnabled: true });
  const [urls, setUrls] = useState<Partial<Record<BrandAssetType, string>>>({});
  const [wmAuto, setWmAuto] = useState<string | null>(null); // текст Instagram, з якого створено знак автоматично
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState<BrandAssetType | null>(null);

  useEffect(() => {
    profileApi
      .get()
      .then((p) => {
        setForm({ name: p.name ?? "", bio: p.bio ?? "", instagram: p.instagram ?? "", watermarkEnabled: p.watermarkEnabled ?? true });
        setUrls({ avatar: p.avatarUrl, logo: p.logoUrl, watermark: p.watermarkUrl });
        setWmAuto(p.watermarkAuto ? p.watermarkAutoText ?? "" : null);
      })
      .catch((e) => setMessage({ ok: false, text: e instanceof Error ? e.message : "Не вдалося завантажити профіль" }))
      .finally(() => setLoading(false));
  }, []);

  const validate = (): Errors => {
    const errs: Errors = {};
    if (!form.name?.trim()) errs.name = "Вкажіть ім’я";
    const ig = normalizeInstagram(form.instagram ?? "");
    if (!ig) errs.instagram = "Вкажіть Instagram";
    else if (!/^@[A-Za-z0-9._]{1,30}$/.test(ig)) errs.instagram = "Некоректний Instagram. Допустимі літери, цифри, крапка й підкреслення";
    if (!urls.avatar) errs.avatar = "Завантажте аватар";
    if (!urls.logo) errs.logo = "Завантажте логотип";
    return errs;
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setMessage({ ok: false, text: "Заповніть усі обов’язкові поля (позначені *)" });
      return;
    }
    const instagram = normalizeInstagram(form.instagram ?? "");
    setSaving(true);
    setMessage(null);
    try {
      await profileApi.update({ name: form.name?.trim(), bio: form.bio, instagram, watermarkEnabled: form.watermarkEnabled });
      setForm((f) => ({ ...f, instagram }));
      let text = "Зміни збережено";

      // Без власного знака використовуємо Instagram: генеруємо PNG з тексту й завантажуємо як знак,
      // щоб сервер накладав його при обробці фото
      const createFromInstagram = async () => {
        const file = await makeTextWatermark(instagram);
        const { url } = await profileApi.uploadBrandAsset("watermark", file, { auto: instagram });
        setUrls((cur) => ({ ...cur, watermark: url }));
        setWmAuto(instagram);
      };
      if (!urls.watermark) {
        if (window.confirm(`Водяний знак не завантажено. Створити його з вашого Instagram (${instagram})?`)) {
          await createFromInstagram();
          text += ". Водяний знак створено з Instagram";
        } else {
          text += ". Без зображення знака у кабінеті використовується текст Instagram";
        }
      } else if (wmAuto !== null && wmAuto !== instagram) {
        await createFromInstagram();
        text += ". Водяний знак оновлено під новий Instagram";
      }
      setMessage({ ok: true, text });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Не вдалося зберегти" });
    } finally {
      setSaving(false);
    }
  };

  const upload = async (type: BrandAssetType, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage({ ok: false, text: "Підтримуються лише JPEG, PNG і WEBP" });
      return;
    }
    setUploading(type);
    setMessage(null);
    try {
      // Зменшуємо перед відправкою: сервер не приймає запити понад ~4.5 MB
      const prepared = await prepareImage(file, type === "avatar" ? 1200 : 1600);
      const { url } = await profileApi.uploadBrandAsset(type, prepared);
      setUrls((cur) => ({ ...cur, [type]: url }));
      if (type === "watermark") setWmAuto(null);
      if (type !== "watermark") setErrors((cur) => ({ ...cur, [type]: undefined }));
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Не вдалося завантажити файл" });
    } finally {
      setUploading(null);
    }
  };



  return (
    <AppShell eyebrow="Кабінет фотографа" title={<>Ваш <em className="font-normal text-[#edc9c0]">профіль</em></>} subtitle="Ім’я, контакти та брендинг, які бачать ваші клієнти.">
      <section className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_1fr]">
          <form onSubmit={save} className="space-y-4 rounded-[24px] border border-[#ddcfc6] bg-[#f8f1eb] p-7 sm:p-9">
            <label className="block text-xs font-medium text-[#6e605a]">Ім’я<Required />
              <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={loading} />
              <FieldError text={errors.name} />
            </label>
            <label className="block text-xs font-medium text-[#6e605a]">Про себе
              <textarea className={inputClass} rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} disabled={loading} placeholder="Весільний фотограф" />
            </label>
            <label className="block text-xs font-medium text-[#6e605a]">Instagram<Required />
              <input className={inputClass} value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} disabled={loading} placeholder="@ivan_photo" />
              <FieldError text={errors.instagram} />
            </label>
            <label className="flex cursor-pointer items-center gap-3 pt-2 text-sm text-[#4d3b36]">
              <input type="checkbox" checked={form.watermarkEnabled ?? true} onChange={(e) => setForm({ ...form, watermarkEnabled: e.target.checked })} className="h-4 w-4 accent-[#71142a]" />
              Накладати водяний знак на фото
            </label>
            <p className="text-xs leading-5 text-[#766961]">
              Знак накладає сервер під час обробки фото. Якщо власний знак не завантажено, він створюється з вашого Instagram. Для вже завантажених фото натисніть «Накласти водяний знак» на сторінці галереї.
            </p>
            {message && <p role="alert" className={`rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-[#2f6b3f]/10 text-[#2f6b3f]" : "bg-[#71142a]/10 text-[#71142a]"}`}>{message.text}</p>}
            <button type="submit" disabled={saving || loading} className="button bg-[#561124] text-white disabled:opacity-60">{saving ? "Зберігаємо…" : "Зберегти"}</button>
          </form>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {assets.map((a) => (
              <div key={a.type} className="flex flex-col rounded-[24px] border border-[#ddcfc6] bg-[#f8f1eb] p-5">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-[#e6d9d0] text-[#b5a39a]">
                  {urls[a.type] ? <img src={urls[a.type]} alt={a.label} className="h-full w-full object-contain" /> : <Icon name="image" size={30} />}
                </div>
                <p className="mt-4 font-serif text-xl text-[#4d1020]">{a.label}{a.required && <Required />}</p>
                <p className="text-xs text-[#766961]">{a.type === "watermark" && wmAuto !== null ? `Створено з Instagram ${wmAuto}` : a.hint}</p>
                {a.type !== "watermark" && <FieldError text={errors[a.type]} />}
                <label className="button mt-4 cursor-pointer border border-[#d8c7bd] text-[#6e605a]">
                  {uploading === a.type ? "Завантажуємо…" : "Завантажити"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploading !== null} onChange={(e) => upload(a.type, e)} />
                </label>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
