import {useEffect, useId, useRef, useState} from 'react';
import {safeContentHref} from './content-body';
import {isPublicHeroImage, type CommunityHeroSlide} from '../lib/community-hero';

type Props = {image: CommunityHeroSlide | null; onOpenChange: (open: boolean) => void};

/** A full presentation of the same guarded derivative, never an original URL. */
export function FullImageDialog({image, onOpenChange}: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [shown, setShown] = useState<CommunityHeroSlide | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!shown) return;
    const element = dialog.current;
    if (!element) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousGutter = root.style.scrollbarGutter;
    element.showModal();
    closeButton.current?.focus({preventScroll: true});
    root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previousOverflow; root.style.scrollbarGutter = previousGutter;
      if (element.open && !trigger.current?.isConnected) document.getElementById('main')?.focus({preventScroll: true});
    };
  }, [shown]);

  useEffect(() => {
    if (shown && image?.image !== shown.image) dialog.current?.close();
  }, [image?.image, shown]);

  const close = () => dialog.current?.close();
  const source = shown?.creditSource ? safeContentHref(shown.creditSource) : null;
  return <>
    <button ref={trigger} type="button" className="button v3-hero-view" aria-haspopup="dialog"
      disabled={!image || !isPublicHeroImage(image.image)}
      onClick={() => {
        if (!image || !isPublicHeroImage(image.image)) return;
        setFailed(false); setLoaded(false); setShown({...image}); onOpenChange(true);
      }}>View full image</button>
    <dialog ref={dialog} className="v3-full-image-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onClose={() => {
        setShown(null); onOpenChange(false);
        if (trigger.current && !trigger.current.disabled) trigger.current.focus({preventScroll: true});
        else document.getElementById('main')?.focus({preventScroll: true});
      }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]'));
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
      }}>
      <header className="v3-full-image-heading"><h2 id={`${id}-title`}>{shown?.title || 'Community image'}</h2>
        <button ref={closeButton} type="button" className="button secondary" onClick={close}>Close<span className="sr-only"> full image</span></button>
      </header>
      <p id={`${id}-description`}>Uncropped community image.</p>
      {shown && <figure className="v3-full-image-figure">
        <div className="v3-full-image-frame">
          {failed ? <p role="alert">This image is unavailable. Close the viewer and try another image.</p> : <>
            {!loaded && <p className="v3-image-loading" role="status">Loading image…</p>}
            <img key={shown.image} src={shown.image} alt={shown.alt || shown.title || 'CarrottCrunch community image'}
              width={shown.width || undefined} height={shown.height || undefined} decoding="async"
              onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/>
          </>}
        </div>
        {shown.credit && <figcaption>{shown.credit}{source && <> · <a href={source} rel="noreferrer">Source</a></>}</figcaption>}
      </figure>}
    </dialog>
  </>;
}
