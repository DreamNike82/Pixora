import { Link } from "react-router-dom";
import pixoraEmblem from "../imports/photo_2026-09-25_20-51-10.jpg";

type Props = {
  light?: boolean;
  href?: string; // "#top" — якір на лендінгу, "/" — перехід на головну
};

export default function Logo({ light = false, href = "#top" }: Props) {
  const className = `flex items-center gap-3 ${light ? "text-[#fff8f1]" : "text-[#5e1023]"}`;
  const content = (
    <>
      <span className="logo-mark"><img src={pixoraEmblem} alt="" /></span>
      <span><strong className="block font-serif text-[25px] font-semibold leading-none tracking-[0.17em]">PIXORA</strong><small className="mt-1 block text-[7px] uppercase tracking-[0.2em] opacity-60">Галереї, які запам’ятовують</small></span>
    </>
  );

  return href.startsWith("/") ? (
    <Link to={href} className={className}>{content}</Link>
  ) : (
    <a href={href} className={className}>{content}</a>
  );
}
