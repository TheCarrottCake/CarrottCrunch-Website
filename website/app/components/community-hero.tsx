import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link} from 'react-router';
import {CrunchMark} from './community';
import {FullImageDialog} from './full-image-dialog';
import {safeContentHref} from './content-body';
import {adjacentHeroSlide, HERO_FADE_MS, HERO_INTERVAL_MS, usableHeroSlides, type CommunityHeroSlide} from '../lib/community-hero';

export function CommunityHero({slides}: {slides: readonly CommunityHeroSlide[]}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const available = useMemo(() => usableHeroSlides(slides, failed), [slides, failed]);
  const [requestedId, setRequestedId] = useState<string | undefined>(available[0]?.id);
  const [displayed, setDisplayed] = useState<CommunityHeroSlide | null>(null);
  const [previous, setPrevious] = useState<CommunityHeroSlide | null>(null);
  const [reduced, setReduced] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const displayedRef = useRef<CommunityHeroSlide | null>(null);
  const candidateImage = useRef<HTMLImageElement>(null);
  const candidate = available.find(slide => slide.id === requestedId) || available[0] || null;
  const shown = available.find(slide => slide.id === displayed?.id && slide.image === displayed.image) || null;
  const old = available.find(slide => slide.id === previous?.id && slide.image === previous.image) || null;
  const candidateKey = candidate ? `${candidate.id}:${candidate.image}` : '';
  const requestRef = useRef(candidateKey);
  requestRef.current = candidateKey;
  const pending = !!candidate && (!shown || shown.id !== candidate.id || shown.image !== candidate.image);
  // Single-image showcases have no cycling/pause controls, so keep them static.
  const moving = available.length > 1 && !reduced && !paused && !hovered && !focused && !hidden && !viewerOpen;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    const visibility = () => setHidden(document.visibilityState === 'hidden');
    update(); visibility();
    query.addEventListener('change', update); document.addEventListener('visibilitychange', visibility);
    return () => {query.removeEventListener('change', update); document.removeEventListener('visibilitychange', visibility);};
  }, []);

  useEffect(() => {
    if (displayed && !shown) {
      displayedRef.current = null; setDisplayed(null); setPrevious(null);
    }
    if (!shown) setViewerOpen(false);
  }, [displayed, shown]);

  const reveal = useCallback((slide: CommunityHeroSlide) => {
    if (requestRef.current !== `${slide.id}:${slide.image}`) return;
    const before = displayedRef.current;
    if (before?.id === slide.id && before.image === slide.image) return;
    setPrevious(reduced ? null : before);
    displayedRef.current = slide; setDisplayed(slide);
  }, [reduced]);

  useEffect(() => {
    const image = candidateImage.current;
    if (candidate && image?.complete && image.naturalWidth > 0) reveal(candidate);
  }, [candidateKey, candidate, reveal]);

  const reject = useCallback((url: string) => {
    setFailed(before => before.has(url) ? before : new Set([...before, url]));
  }, []);

  const move = useCallback((direction: number, byUser = true) => {
    const target = adjacentHeroSlide(available, candidate?.id || shown?.id, direction);
    if (!target) return;
    setManual(byUser); setPrevious(null); setRequestedId(target.id);
  }, [available, candidate?.id, shown?.id]);

  useEffect(() => {
    if (!shown || pending || available.length < 2 || !moving) return;
    const timer = window.setTimeout(() => move(1, false), HERO_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [shown?.id, shown?.image, pending, available.length, moving, move]);

  useEffect(() => {
    if (!previous) return;
    if (reduced) {setPrevious(null); return;}
    const timer = window.setTimeout(() => setPrevious(null), HERO_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [previous, reduced]);

  useEffect(() => {
    if (!shown || pending || available.length < 2) return;
    const next = adjacentHeroSlide(available, shown.id, 1);
    if (!next || next.image === shown.image) return;
    // One next image only, after the current image is ready; never preload the collection.
    const image = new Image(); image.decoding = 'async'; image.fetchPriority = 'low';
    image.onerror = () => reject(next.image); image.src = next.image;
    return () => {image.onerror = null; image.onload = null;};
  }, [shown?.id, shown?.image, pending, available, reject]);

  const layers = [pending ? null : old, shown, candidate].filter((slide, index, all): slide is CommunityHeroSlide =>
    !!slide && all.findIndex(other => other?.image === slide.image) === index);
  const index = shown ? available.findIndex(slide => slide.id === shown.id) : -1;
  const link = shown?.link ? safeContentHref(shown.link) : null;
  const source = shown?.creditSource ? safeContentHref(shown.creditSource) : null;

  return <section id="home" className="v3-hero" aria-label="Community showcase" aria-roledescription={available.length > 1 ? 'carousel' : undefined}
    data-has-image={!!shown} data-moving={moving} data-reduced={reduced} data-transitioning={!!old && !pending && !reduced}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => {if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);}}>
    <div className="v3-hero-images">
      {layers.map(slide => {
        const active = slide.image === shown?.image;
        const outgoing = !active && slide.image === old?.image;
        return <div key={slide.image} className="v3-hero-layer" data-active={active} data-previous={outgoing}
          data-loaded={active || outgoing} aria-hidden={!active}>
          <img ref={slide.image === candidate?.image ? candidateImage : undefined} className="v3-hero-image"
            src={slide.image} alt={active ? slide.alt || slide.title || 'CarrottCrunch community image' : ''}
            width={slide.width || undefined} height={slide.height || undefined} decoding="async" loading="eager"
            fetchPriority={!displayed ? 'high' : 'auto'} onLoad={() => reveal(slide)} onError={() => reject(slide.image)}/>
        </div>;
      })}
    </div>
    <CrunchMark className="v3-hero-emblem"/>
    <div className="v3-hero-shade" aria-hidden="true"/>
    <div className="v3-hero-fade" aria-hidden="true"/>
    <div className="v3-container v3-hero-copy">
      <p className="eyebrow v3-hero-eyebrow"><span aria-hidden="true">✳</span> A little crunch. A lot of community.</p>
      <h1 className="v3-display v3-hero-title">Find your people.{' '}<br/>Build your <span className="v3-world">world.</span></h1>
      <p className="v3-hero-support">Good games bring us together.<br/>Great people make us stay.<br/>Welcome to CarrottCrunch.</p>
      <div className="v3-hero-actions">
        <Link className="button primary v3-primary-action" to="/join"><span aria-hidden="true">◉</span> Join the Discord ↗</Link>
        <a className="button secondary" href="#server">Explore Minecraft <span aria-hidden="true">→</span></a>
      </div>
    </div>
    <div className="v3-container v3-hero-footer">
      <div className="v3-hero-details">
      <div className="v3-hero-meta" role="group" aria-label="Current community image details" tabIndex={shown ? 0 : undefined}>
        {shown ? <><p className="v3-hero-community">CarrottCrunch · Minecraft</p>{shown.title && <p className="v3-hero-image-title">{shown.title}</p>}{shown.text && <p>{shown.text}</p>}
          {link && <a href={link} rel="noreferrer">{shown.linkText || 'Learn more'}</a>}
          {shown.credit && <p>{shown.credit}{source && <> · <a href={source} rel="noreferrer">Source</a></>}</p>}
        </> : <p>{candidate ? 'Loading community image…' : 'No community image is available.'}</p>}
        {!candidate && failed.size > 0 && <button className="button secondary" type="button" onClick={() => {
          setFailed(new Set()); setDisplayed(null); displayedRef.current = null; setPrevious(null); setRequestedId(undefined);
        }}>Retry images</button>}
      </div>
      <div className="v3-hero-progress" role="img" aria-hidden={!shown} aria-label={shown ? `Slide ${index + 1} of ${available.length}` : undefined}>
        {available.map(slide => <span key={slide.id} aria-hidden="true" data-active={slide.id === shown?.id}/>)}
      </div>
      </div>
      {(candidate || shown) && <div className="v3-hero-control-panel">
        {available.length > 1 && <div className="v3-hero-controls">
          <button type="button" className="v3-hero-control" aria-label="Previous slide" onClick={() => move(-1)}>←</button>
          <span className="v3-hero-count" aria-hidden="true">{shown ? index + 1 : '–'} / {available.length}</span>
          <button type="button" className="v3-hero-control" aria-label="Next slide" onClick={() => move(1)}>→</button>
          <button type="button" className="v3-hero-control" disabled={reduced} aria-pressed={paused}
            aria-label={reduced ? 'Automatic slideshow disabled for reduced motion' : paused ? 'Resume slideshow' : 'Pause slideshow'}
            onClick={() => setPaused(!paused)}>{paused || reduced ? '▶' : 'Ⅱ'}</button>
        </div>}
        <FullImageDialog image={shown} onOpenChange={setViewerOpen}/>
      </div>}
    </div>
    <p className="sr-only" role="status" aria-live={manual ? 'polite' : 'off'} aria-atomic="true">
      {shown ? `Image ${index + 1} of ${available.length}${shown.title ? ': ' + shown.title : ''}` : candidate ? 'Loading community image.' : 'Community image unavailable.'}
    </p>
  </section>;
}
