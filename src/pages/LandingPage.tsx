import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import type { AuthMode } from "../components/AuthModal";
import Icon from "../components/Icon";
import Logo from "../components/Logo";
import { useAuth } from "../auth/AuthContext";
import { billingApi } from "../api/billing";
import type { CheckoutTier } from "../api/billing";

const gallery = [
  ["https://images.unsplash.com/photo-1759054710581-c7745b02cb53?auto=format&fit=crop&w=700&q=85", "Молодята у вечірньому саду"],
  ["https://images.unsplash.com/photo-1574715244460-d1102b48b932?auto=format&fit=crop&w=700&q=85", "Весільна прогулянка біля моря"],
  ["https://images.unsplash.com/photo-1727421275800-403ce80b697c?auto=format&fit=crop&w=700&q=85", "Наречені на балконі"],
  ["https://images.unsplash.com/photo-1748367961459-df3182feae2d?auto=format&fit=crop&w=700&q=85", "Пара на заході сонця"],
  ["https://images.unsplash.com/photo-1669235965329-4fa902b058d4?auto=format&fit=crop&w=700&q=85", "Закохані в старому місті"],
  ["https://images.unsplash.com/photo-1758912857219-f1ad820bd335?auto=format&fit=crop&w=700&q=85", "Силует пари у Венеції"],
];

const features = [
  ["heart", "Зручний відбір", "Клієнти обирають кадри серцем і залишають точні коментарі до ретуші."],
  ["brand", "Ваше ім’я у фокусі", "Логотип, кольори студії та власний підпис — без сторонньої реклами."],
  ["copy", "Експорт у Lightroom", "Один клік — і список назв вибраних файлів уже у вашому буфері обміну."],
  ["shield", "Приватність галерей", "Захищений доступ за персональним посиланням або PIN-кодом."],
  ["phone", "Бездоганно на телефоні", "Продуманий мобільний перегляд, яким приємно користуватися пальцем."],
  ["image", "Якість без компромісів", "Веб-версії для швидкого перегляду та оригінали для завантаження."],
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [liked, setLiked] = useState(new Set([0, 3]));
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [pendingTier, setPendingTier] = useState<CheckoutTier | null>(null);

  const startCheckout = async (tier: CheckoutTier) => {
    try {
      const { url } = await billingApi.checkout(tier, "month");
      window.location.href = url;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не вдалося створити оплату");
    }
  };

  // Безкоштовний старт: гостю показуємо реєстрацію, авторизованого ведемо в кабінет
  const startFree = () => {
    if (user) navigate("/dashboard");
    else setAuthMode("register");
  };

  const choosePlan = (tier: CheckoutTier | null) => {
    if (!tier) return startFree();
    if (!user) {
      setPendingTier(tier);
      return setAuthMode("register");
    }
    startCheckout(tier);
  };

  const closeAuth = () => {
    setAuthMode(null);
    setPendingTier(null);
  };

  const toggleLike = (index: number) => {
    setLiked((current) => {
      const next = new Set(current);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  return (
    <main id="top" className="overflow-hidden bg-[#f7f0e9] text-[#2a211e]">
      <header className="absolute inset-x-0 top-0 z-50 border-b border-white/15">
        <div className="mx-auto flex h-24 max-w-[1340px] items-center px-5 sm:px-8">
          <Logo light />
          <nav className="ml-auto hidden items-center gap-9 text-[13px] text-white/75 lg:flex">
            <a href="#product" className="nav-link">Можливості</a>
            <a href="#workflow" className="nav-link">Як це працює</a>
            <a href="#pricing" className="nav-link">Тарифи</a>
            <a href="#gallery" className="nav-link">Демо-галерея</a>
          </nav>
          <div className="ml-9 hidden items-center gap-3 lg:flex">
            {loading ? null : user ? (
              <>
                <Link to="/dashboard" className="button button-light">Кабінет</Link>
                <button onClick={logout} className="px-4 py-2 text-sm text-white/85">Вийти</button>
              </>
            ) : (
              <>
                <button onClick={() => setAuthMode("login")} className="px-4 py-2 text-sm text-white/85">Увійти</button>
                <button onClick={() => setAuthMode("register")} className="button button-light">Створити галерею <Icon name="arrow" size={17} /></button>
              </>
            )}
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="ml-auto text-white lg:hidden" aria-label="Відкрити меню"><Icon name={menuOpen ? "close" : "menu"} size={26} /></button>
        </div>
        {menuOpen && <nav className="border-t border-white/10 bg-[#45101d] px-5 py-5 text-white lg:hidden"><div className="flex flex-col gap-4 text-sm"><a href="#product" onClick={() => setMenuOpen(false)}>Можливості</a><a href="#workflow" onClick={() => setMenuOpen(false)}>Як це працює</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Тарифи</a><a href="#gallery" onClick={() => setMenuOpen(false)}>Демо-галерея</a>{!loading && (user ? <><Link to="/dashboard" onClick={() => setMenuOpen(false)}>Кабінет</Link><button className="text-left" onClick={() => { setMenuOpen(false); logout(); }}>Вийти</button></> : <button className="text-left" onClick={() => { setMenuOpen(false); setAuthMode("login"); }}>Увійти</button>)}</div></nav>}
      </header>

      <section className="relative min-h-[760px] bg-[#3d0d1a] text-white lg:min-h-[850px]">
        <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=90" alt="Весільна церемонія серед квітів" className="absolute inset-0 h-full w-full object-cover object-center opacity-45" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(39,5,14,.94)_0%,rgba(58,9,23,.75)_48%,rgba(58,9,23,.2)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(41,7,15,.7)_0%,transparent_45%)]" />
        <div className="relative mx-auto flex min-h-[760px] max-w-[1340px] items-center px-5 pb-20 pt-36 sm:px-8 lg:min-h-[850px]">
          <div className="max-w-[760px]">
            <p className="mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.24em] text-[#e6c1b7]"><span className="h-px w-10 bg-[#d9a79c]" /> Онлайн-галереї для фотографів</p>
            <h1 className="font-serif text-[56px] font-medium leading-[0.93] tracking-[-0.025em] sm:text-[74px] lg:text-[92px]">Краще, ніж просто<br /><em className="font-normal text-[#edc9c0]">фотографії</em></h1>
            <p className="mt-7 max-w-[570px] text-base leading-7 text-white/72 sm:text-lg">Створюйте елегантні галереї, в яких клієнти закохуються у свої кадри, легко обирають найкращі та залишають точні коментарі.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              {user ? <Link to="/dashboard" className="button button-blush">Перейти в кабінет <Icon name="arrow" size={18} /></Link> : <button onClick={startFree} className="button button-blush">Створити першу галерею <Icon name="arrow" size={18} /></button>}
              <a href="#product" className="button button-ghost">Дізнатися більше</a>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/55">
              <span className="flex items-center gap-2"><Icon name="check" size={15} /> Без картки</span>
              <span className="flex items-center gap-2"><Icon name="check" size={15} /> 5 GB безкоштовно</span>
              <span className="flex items-center gap-2"><Icon name="check" size={15} /> Налаштування за 3 хвилини</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 hidden w-[38%] border-l border-t border-white/15 bg-[#3b0c18]/65 px-10 py-7 backdrop-blur-md lg:block">
          <p className="font-serif text-2xl">Love Story — Влад і Марія</p>
          <div className="mt-3 flex items-center gap-3"><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[70%] bg-[#e5b5aa]" /></div><span className="text-xs text-white/70">14 / 20</span></div>
        </div>
      </section>

      <section id="product" className="relative py-24 sm:py-32">
        <div className="decor-leaf left-[-30px] top-20">⌇</div>
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
            <div>
              <p className="eyebrow">Створено фотографами</p>
              <h2 className="section-title">Від хаосу —<br />до <em>естетики</em></h2>
            </div>
            <p className="max-w-[580px] text-base leading-7 text-[#6e605a] lg:pb-2">Забудьте про списки номерів у месенджерах, загублені коментарі та нескінченні папки на диску. PIXORA збирає весь процес відбору в одному красивому просторі.</p>
          </div>
          <div className="mt-16 grid gap-5 lg:grid-cols-2">
            <div className="rounded-[24px] border border-[#ddcfc6] bg-[#eee5de] p-6 sm:p-9">
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#8c7b72]">Як було раніше</span>
              <div className="mt-8 space-y-3">
                {["IMG_4829.JPG", "IMG_4830.JPG", "IMG_4831.JPG"].map((name, index) => <div key={name} className={`flex items-center gap-3 rounded-xl border border-[#d8cbc3] bg-[#f8f3ef] p-3 text-sm text-[#756962] ${index === 1 ? "translate-x-4" : ""}`}><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7ddd7] text-[#8d7d75]"><Icon name="image" size={15} /></span>{name}</div>)}
              </div>
              <div className="ml-8 mt-5 rounded-2xl rounded-tr-sm bg-white p-4 text-sm leading-6 text-[#6e625c] shadow-sm">Привіт! Відретушуй 12-ту фотку, де я боком, і ще IMG_4830…</div>
            </div>
            <div className="relative overflow-hidden rounded-[24px] bg-[#541225] p-6 text-white sm:p-9">
              <div className="absolute right-[-20px] top-[-40px] text-[160px] text-white/5">✣</div>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#ddb5aa]">З PIXORA</span>
              <div className="relative mt-8 grid grid-cols-3 gap-3">
                {gallery.slice(0, 3).map(([src, alt], index) => <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-xl"><img src={src} alt={alt} className="h-full w-full object-cover" /><span className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full ${index === 1 ? "bg-[#71142a] text-white" : "bg-white/85 text-[#671226]"}`}><Icon name="heart" size={13} /></span></div>)}
              </div>
              <div className="mt-5 flex items-end justify-between"><div><p className="font-serif text-2xl">Ранок нареченої</p><p className="mt-1 text-xs text-white/55">14 із 20 фото відібрано</p></div><div className="grid h-11 w-11 place-items-center rounded-full bg-[#e8beb5] text-[#5e1023]"><Icon name="arrow" /></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#efe3da] py-24 sm:py-32">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="mx-auto max-w-[720px] text-center"><p className="eyebrow justify-center">Все необхідне в одному місці</p><h2 className="section-title">Менше рутини.<br /><em>Більше творчості.</em></h2></div>
          <div className="mt-16 grid gap-px overflow-hidden rounded-[24px] border border-[#d9c9bf] bg-[#d9c9bf] sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([icon, title, text], index) => <article key={title} className="group bg-[#f8f1eb] p-7 transition hover:bg-[#fffaf5] sm:p-9"><div className="mb-8 flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-full border border-[#cba9a0] text-[#711429]"><Icon name={icon} size={21} /></span><span className="font-serif text-sm text-[#b5a39a]">0{index + 1}</span></div><h3 className="font-serif text-2xl text-[#4d1020]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#766861]">{text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="gallery" className="bg-[#211a18] py-24 text-white sm:py-32">
        <div className="mx-auto max-w-[1340px] px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div><p className="eyebrow eyebrow-light">Погляд очима клієнта</p><h2 className="section-title section-title-light">Галерея, яку хочеться<br /><em>переглядати знову</em></h2></div>
            <div className="max-w-[360px]"><div className="flex justify-between text-xs font-medium text-white/90"><span>Ваш відбір</span><span>{liked.size} / 20 фото</span></div><div className="mt-3 h-1 overflow-hidden rounded bg-white/20"><div className="h-full bg-[#f0c0b5] transition-all" style={{ width: `${liked.size * 5}%` }} /></div></div>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            {gallery.map(([src, alt], index) => <article key={src} className="group relative aspect-[3/4] overflow-hidden rounded-xl"><img src={src} alt={alt} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition group-hover:opacity-100" /><button onClick={() => toggleLike(index)} className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur transition ${liked.has(index) ? "bg-[#711329] text-white" : "bg-white/85 text-[#661225]"}`} aria-label="Додати фото до обраних"><Icon name="heart" size={16} /></button></article>)}
          </div>
        </div>
      </section>

      <section id="workflow" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-[.75fr_1.25fr]">
            <div><p className="eyebrow">Простий процес</p><h2 className="section-title">Від зйомки<br />до <em>«вау»</em></h2><p className="mt-6 max-w-[370px] text-sm leading-7 text-[#75675f]">Три зрозумілі кроки замість довгих інструкцій і десятків повідомлень.</p></div>
            <div className="divide-y divide-[#dccdc4] border-y border-[#dccdc4]">
              {[["01", "Завантажте зйомку", "Перетягніть фотографії — PIXORA підготує легкі прев’ю та збереже оригінали."], ["02", "Надішліть красиве посилання", "Поділіться персональною галереєю у будь-якому зручному месенджері."], ["03", "Отримайте готовий відбір", "Перегляньте коментарі та скопіюйте список назв файлів прямо в Lightroom."]].map(([num, title, text]) => <div key={num} className="grid gap-4 py-8 sm:grid-cols-[60px_1fr_1.2fr] sm:items-start"><span className="font-serif text-sm text-[#9f6f67]">{num}</span><h3 className="font-serif text-[26px] text-[#531022]">{title}</h3><p className="text-sm leading-6 text-[#766961]">{text}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-[#efe3da] py-24 sm:py-32">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="text-center"><p className="eyebrow justify-center">Прозорі тарифи</p><h2 className="section-title">Почніть у своєму <em>ритмі</em></h2><p className="mx-auto mt-5 max-w-[520px] text-sm leading-6 text-[#766961]">Без прихованих платежів. Змінюйте план, коли ваша справа зростає.</p></div>
          <div className="mt-14 grid items-stretch gap-4 lg:grid-cols-3">
            {[{ name: "Start", price: "$0", note: "Для першого знайомства", items: ["5 GB сховища", "До 3 активних галерей", "Зручний відбір фото"], cta: "Почати безкоштовно", tier: null as CheckoutTier | null }, { name: "Pro", price: "$15", note: "Для активних фотографів", items: ["100 GB сховища", "Необмежені галереї", "Власний логотип і водяний знак", "Оригінали та ZIP"], cta: "Обрати Pro", tier: "PRO" as CheckoutTier | null, featured: true }, { name: "Studio", price: "$45", note: "Для студій та команд", items: ["1 TB сховища", "Усі можливості Pro", "Командний доступ", "Пріоритетна підтримка"], cta: "Обрати Studio", tier: "STUDIO" as CheckoutTier | null }].map((plan) => <article key={plan.name} className={`relative flex flex-col rounded-[24px] p-8 sm:p-10 ${plan.featured ? "bg-[#561124] text-white shadow-[0_22px_60px_rgba(70,11,26,.2)] lg:-translate-y-4" : "border border-[#d8c7bd] bg-[#f8f1eb]"}`}>{plan.featured && <span className="absolute right-6 top-6 rounded-full bg-[#e5b9af] px-3 py-1 text-[10px] uppercase tracking-[.15em] text-[#541024]">Найчастіше обирають</span>}<p className={`text-xs uppercase tracking-[.18em] ${plan.featured ? "text-[#ddb4aa]" : "text-[#8d7a71]"}`}>{plan.name}</p><p className="mt-5 font-serif text-6xl">{plan.price}<span className="font-sans text-sm font-normal opacity-50"> / міс</span></p><p className="mt-3 text-sm opacity-60">{plan.note}</p><div className={`my-7 h-px ${plan.featured ? "bg-white/15" : "bg-[#ddcec5]"}`} /><ul className="space-y-4 text-sm">{plan.items.map((item) => <li key={item} className="flex items-center gap-3"><span className={plan.featured ? "text-[#e0b3a8]" : "text-[#751429]"}><Icon name="check" size={16} /></span>{item}</li>)}</ul><button onClick={() => choosePlan(plan.tier)} className={`button mt-10 w-full justify-center ${plan.featured ? "button-blush" : "border border-[#77152b] text-[#641225]"}`}>{plan.cta} <Icon name="arrow" size={17} /></button></article>)}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#4b0e20] py-24 text-center text-white sm:py-28">
        <div className="absolute left-1/2 top-1/2 text-[350px] text-white/[.025] -translate-x-1/2 -translate-y-1/2">✣</div>
        <div className="relative mx-auto max-w-[760px] px-5"><p className="eyebrow eyebrow-light justify-center">Ваша наступна галерея</p><h2 className="font-serif text-5xl leading-none text-white sm:text-7xl">Нехай фотографії<br /><em className="text-[#f0c5bb]">говорять за вас</em></h2><p className="mx-auto mt-6 max-w-[520px] text-sm font-medium leading-6 text-white/85">Створіть першу галерею безкоштовно. Без кредитної картки та складного налаштування.</p>{user ? <Link to="/dashboard" className="button button-blush mt-9">Перейти в кабінет <Icon name="arrow" size={18} /></Link> : <button onClick={startFree} className="button button-blush mt-9">Спробувати PIXORA <Icon name="arrow" size={18} /></button>}</div>
      </section>

      <footer className="bg-[#211a18] px-5 py-10 text-white/55 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-7 sm:flex-row sm:items-center"><Logo light /><p className="text-xs sm:ml-auto">© 2026 PIXORA. Створено для фотографів.</p><div className="flex gap-6 text-xs"><a href="#">Умови</a><a href="#">Конфіденційність</a><a href="#">Підтримка</a></div></div>
      </footer>

      {authMode && (
        <AuthModal
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={closeAuth}
          onSuccess={() => { if (pendingTier) startCheckout(pendingTier); else navigate("/dashboard"); }}
        />
      )}
    </main>
  );
}
