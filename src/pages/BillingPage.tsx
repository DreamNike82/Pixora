import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { billingApi } from "../api/billing";
import type { BillingStatus, CheckoutTier, StorageUsage } from "../api/billing";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";
import { legalUrl } from "../lib/legal";
import usePageMeta from "../hooks/usePageMeta";

const plans: { tier: CheckoutTier; name: string; price: string; items: string[] }[] = [
  { tier: "PRO", name: "Pro", price: "$15", items: ["100 GB сховища", "Необмежені галереї", "Власний логотип і водяний знак", "Оригінали та ZIP"] },
  { tier: "STUDIO", name: "Studio", price: "$45", items: ["1 TB сховища", "Усі можливості Pro", "Командний доступ", "Пріоритетна підтримка"] },
];

const formatBytes = (bytes: number) => {
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
};

export default function BillingPage() {
  usePageMeta({ title: "Тариф і оплата", noindex: true });
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    // Повернення зі Stripe: синхронізуємо сесію, потім підтягуємо актуальний статус.
    // Точний вигляд success-URL уточни у бекендера — тут підтримано ?checkout=success та ?session_id=
    const returned = params.get("checkout") === "success" || params.has("session_id");
    (async () => {
      if (returned) {
        await billingApi.syncSession().then(() => setNotice("Оплату підтверджено. Дякуємо!")).catch(() => {});
        setParams({}, { replace: true });
      }
      billingApi.status().then(setStatus).catch((e) => setError(e instanceof Error ? e.message : "Не вдалося завантажити тариф"));
      billingApi.syncStorage().then(setStorage).catch(() => {});
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const go = async (key: string, getUrl: () => Promise<{ url: string }>) => {
    setBusy(key);
    setError(null);
    try {
      window.location.href = (await getUrl()).url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Щось пішло не так");
      setBusy(null);
    }
  };

  const currentTier = status?.tier?.toUpperCase();
  const percent = storage ? Math.min(100, (storage.usedBytes / storage.limitBytes) * 100) : 0;

  return (
    <AppShell eyebrow="Кабінет фотографа" title={<>Ваш <em className="font-normal text-[#edc9c0]">тариф</em></>} subtitle={status ? `Поточний план: ${status.tier}${status.active ? "" : " (неактивний)"}` : undefined}>
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1240px] space-y-8 px-5 sm:px-8">
          {notice && <p role="status" className="rounded-xl bg-[#2f6b3f]/10 px-4 py-3 text-sm text-[#2f6b3f]">{notice}</p>}
          {error && <p role="alert" className="rounded-xl bg-[#71142a]/10 px-4 py-3 text-sm text-[#71142a]">{error}</p>}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[24px] border border-[#ddcfc6] bg-[#f8f1eb] p-7 sm:p-9">
              <h2 className="font-serif text-3xl text-[#4d1020]">Сховище</h2>
              {storage ? (
                <>
                  <p className="mt-3 text-sm text-[#766961]">Використано {formatBytes(storage.usedBytes)} із {formatBytes(storage.limitBytes)}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded bg-[#e6d9d0]"><div className={`h-full ${percent > 90 ? "bg-[#71142a]" : "bg-[#c98e82]"}`} style={{ width: `${percent}%` }} /></div>
                </>
              ) : <p className="mt-3 text-sm text-[#766961]">Рахуємо…</p>}
            </div>
            <div className="rounded-[24px] border border-[#ddcfc6] bg-[#f8f1eb] p-7 sm:p-9">
              <h2 className="font-serif text-3xl text-[#4d1020]">Підписка</h2>
              <p className="mt-3 text-sm text-[#766961]">{status?.expiresAt ? `Діє до ${new Date(status.expiresAt).toLocaleDateString("uk-UA")}` : "Керуйте карткою та рахунками у Stripe."}</p>
              <button onClick={() => go("portal", billingApi.portal)} disabled={busy !== null} className="button mt-5 border border-[#d8c7bd] text-[#6e605a] disabled:opacity-60">
                {busy === "portal" ? "Відкриваємо…" : "Керувати оплатою"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {plans.map((plan) => {
              const current = currentTier === plan.tier && status?.active;
              return (
                <article key={plan.tier} className="flex flex-col rounded-[24px] border border-[#d8c7bd] bg-[#f8f1eb] p-8 sm:p-10">
                  <p className="text-xs uppercase tracking-[.18em] text-[#8d7a71]">{plan.name}</p>
                  <p className="mt-4 font-serif text-5xl text-[#4d1020]">{plan.price}<span className="font-sans text-sm font-normal opacity-50"> / міс</span></p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {plan.items.map((item) => <li key={item} className="flex items-center gap-3"><span className="text-[#751429]"><Icon name="check" size={16} /></span>{item}</li>)}
                  </ul>
                  <button onClick={() => go(plan.tier, () => billingApi.checkout(plan.tier, "month"))} disabled={current || busy !== null} className="button mt-8 bg-[#561124] text-white disabled:opacity-60">
                    {current ? "Поточний план" : busy === plan.tier ? "Переходимо до оплати…" : `Обрати ${plan.name}`}
                  </button>
                </article>
              );
            })}
          </div>
          <p className="text-center text-xs leading-5 text-[#766961]">
            Оплата через Stripe. Перед оформленням ознайомтеся з <a href={legalUrl("refund")} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#71142a] underline underline-offset-4">політикою повернення коштів</a> та <a href={legalUrl("terms")} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#71142a] underline underline-offset-4">умовами використання</a>.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
