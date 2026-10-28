import {useId, useState} from 'react';
import type {PublicStaffVoice, StaffVoicePortrait} from '../lib/staff-voices';
import {isPublicHeroImage} from '../lib/community-hero';
import {safeContentHref} from './content-body';

function Portrait({image}: {image: StaffVoicePortrait}) {
  const [failed, setFailed] = useState(false);
  if (failed || !isPublicHeroImage(image.src)) return null;
  return <img className="v3-staff-portrait" src={image.src} alt={image.alt} width={image.width} height={image.height}
    loading="lazy" decoding="async" onError={() => setFailed(true)}/>;
}

export function StaffVoices({contributions}: {contributions: readonly PublicStaffVoice[]}) {
  const id = useId();
  if (!contributions.length) return null;
  return <section className="v3-staff-voices" aria-labelledby={id}>
    <div className="v3-about-section-title"><span className="v3-section-index" aria-hidden="true">04 /</span><h2 id={id}>Staff Voices</h2></div>
    <div className="v3-staff-voices-grid">{contributions.map((voice, index) => {
      const portrait = voice.anonymous ? undefined : voice.portrait;
      const source = portrait?.source ? safeContentHref(portrait.source) : null;
      return <figure className="v3-staff-voice" key={index}>
        <blockquote>{voice.message.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}</blockquote>
        <figcaption>
          <div className="v3-staff-attribution">{portrait && <Portrait key={portrait.src} image={portrait}/>}<div>
            <strong>{voice.anonymous ? 'Staff member' : voice.displayName}</strong>
            {!voice.anonymous && voice.roleLabel && <p>{voice.roleLabel}</p>}
          </div></div>
          {portrait?.requiredCredit && <p className="v3-staff-portrait-credit">{portrait.requiredCredit}{source && <> · <a href={source} rel="noreferrer">Source</a></>}</p>}
        </figcaption>
      </figure>;
    })}</div>
  </section>;
}
