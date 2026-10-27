import { useEffect } from "react";
import { legalUrl } from "../lib/legal";
import type { LegalPage } from "../lib/legal";

/**
 * /terms, /privacy, /cookies, /refund на фронтенді → відповідні сторінки на бекенді.
 * Корисно, коли посилання на умови вимагають «на вашому домені» (Stripe, Google, форми реєстрації).
 */
export default function LegalRedirect({ page }: { page: LegalPage }) {
  const url = legalUrl(page);
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f0e9] px-5 text-center text-sm text-[#766961]">
      <p>Переходимо на сторінку… Якщо нічого не сталося, <a className="font-semibold text-[#71142a] underline underline-offset-4" href={url}>відкрийте її вручну</a>.</p>
    </main>
  );
}
