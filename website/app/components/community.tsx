import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router";

/** Temporary bitten-C brand mark, shared by branding and decorative accents. */
export function CrunchMark({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 40 40" aria-hidden="true"><path fill="currentColor" d="M33 8a17 17 0 1 0 1 23l-8-7a7 7 0 1 1-1-9l4-2-2-4z"/><path fill="currentColor" d="m33 15 4-2 2 4-4 2zM30 3l4-2 2 4-4 2z"/></svg>;
}

export type FeatureCardProps = {
  icon: string;
  name: string;
  text: string;
  tag: string;
  accent: "orange" | "coral" | "green";
};

export function FeatureCard({ icon, name, text, tag, accent }: FeatureCardProps) {
  return <article className={`feature feature--${accent}`}>
    <CrunchMark className="feature-crunch"/>
    <span className="feature-icon" aria-hidden="true">{icon}</span>
    <h3>{name}</h3><p>{text}</p><span className="micro">{tag}</span>
  </article>;
}

export function Brand() {
  return <Link className="brand" to="/" aria-label="CarrottCrunch home"><CrunchMark/><span>Carrott<span className="brand-light">Crunch</span><span className="brand-dot">.</span></span></Link>;
}
const navigation = [["Community", "/community"], ["Servers", "/servers"], ["Gallery", "/gallery"], ["Updates", "/updates"], ["About", "/about"], ["Safety", "/safety"]];
export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <header className={`site-header${scrolled ? " is-scrolled" : ""}`} onKeyDown={event => {
    if (event.key === "Escape" && open) { setOpen(false); toggle.current?.focus(); }
  }}><div className="header-inner"><Brand/><button ref={toggle} className="menu-toggle" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? "Close ✕" : "Menu ☰"}</button><nav id="main-nav" aria-label="Main navigation" className={open ? "nav open" : "nav"}>{navigation.map(([name, id]) => <NavLink key={id} to={id} onClick={() => setOpen(false)}>{name}</NavLink>)}<Link className="nav-join" to="/join" onClick={() => setOpen(false)}>Find your people <span>↗</span></Link></nav></div></header>;
}
type ShowcaseSlide = { label: string; title: string; text: string; theme: string; image: string };
const slides: ShowcaseSlide[] = [
  { label: "THE OVERWORLD", title: "Big worlds. Better company.", text: "A little adventure. A lot of possibility. Make room for your next shared story.", theme: "overworld", image: "/images/overworld.svg" },
  { label: "THE BUILDERS’ CORNER", title: "From one block to something epic.", text: "Bring your wildest ideas. The best builds start with a little imagination.", theme: "builders", image: "/images/create-workshop-placeholder.svg" },
  { label: "AFTER HOURS", title: "One more game. One more memory.", text: "For the late-night laughs and the adventures you didn’t see coming.", theme: "night", image: "/images/after-hours-placeholder.svg" },
];
export function Showcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const interacting = hovered || focused;
  const [reduced, setReduced] = useState(true);
  useEffect(() => { const query = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReduced(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  useEffect(() => { if (paused || interacting || reduced) return; const timer = window.setInterval(() => setActive(value => (value + 1) % slides.length), 7000); return () => window.clearInterval(timer); }, [paused, interacting, reduced]);
  const slide = slides[active];
  return <section className={`showcase ${slide.theme}`} aria-roledescription="carousel" aria-label="Community showcase" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}><div className="landscape" style={{ backgroundImage: `url("${slide.image}")` }} aria-hidden="true"/><div className="showcase-shade"/><CrunchMark className="showcase-crunch"/><div className="showcase-top"><span className="scene-tag"><span/> A WORLD WORTH SHARING</span><span className="concept-label">ILLUSTRATED PLACEHOLDER</span></div><div className="scene-copy" aria-live={paused || interacting || reduced ? "polite" : "off"}><span className="eyebrow">{slide.label}</span><h2>{slide.title}</h2><p>{slide.text}</p></div><div className="showcase-bottom"><div className="slide-dots">{slides.map((item, index) => <button key={item.label} aria-label={`Show slide ${index + 1}: ${item.label}`} aria-current={active === index ? "true" : undefined} onClick={() => setActive(index)}/>)}</div><div className="slide-controls"><span>0{active + 1} <span className="muted">/ {String(slides.length).padStart(2, "0")}</span></span><button aria-label="Previous slide" onClick={() => setActive(value => (value + slides.length - 1) % slides.length)}>←</button><button aria-pressed={paused} aria-label={paused ? "Resume slideshow" : "Pause slideshow"} onClick={() => setPaused(!paused)}>{paused ? "▶" : "Ⅱ"}</button><button aria-label="Next slide" onClick={() => setActive(value => (value + 1) % slides.length)}>→</button></div></div></section>;
}
export function SectionHeading({ number, eyebrow, title, children }: { number: string; eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="section-heading"><div><div className="eyebrow"><span className="section-number">{number} /</span> {eyebrow}</div><h2>{title}</h2></div>{children}</div>;
}
export function Footer() {
  return <footer className="site-footer"><div className="footer-top"><div><Brand/><p>Good games. Great people. A little extra crunch.</p></div><a href="#page-top">Back to the top ↑</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CarrottCrunch</span><span>Made for the moments between the games.</span><span>Community website · In development</span></div></footer>;
}
