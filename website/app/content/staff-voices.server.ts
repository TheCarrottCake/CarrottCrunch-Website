import type {PublicStaffVoice, StaffVoicePortrait} from '../lib/staff-voices';
import {isPublicHeroImage} from '../lib/community-hero';
import {safeContentHref} from '../components/content-body';

export type CuratedStaffVoice = {
  message: string;
  anonymous?: boolean;
  displayName?: string;
  roleLabel?: string;
  portrait?: StaffVoicePortrait;
  consent: {message: boolean; name?: boolean; role?: boolean; portrait?: boolean};
};

// Add only genuinely supplied contributions with explicit consent to these exact
// public fields. Consent evidence stays private, outside this module and payload.
// No statements, names or portraits have been supplied for publication yet.
const contributions: readonly CuratedStaffVoice[] = [];

export function projectStaffVoices(input: readonly CuratedStaffVoice[]): PublicStaffVoice[] {
  const result: PublicStaffVoice[] = [];
  for (const item of input) {
    if (!item.consent?.message || !item.message.trim()) continue;
    if (item.anonymous) {
      result.push({anonymous: true, displayName: 'Staff member', message: item.message});
      continue;
    }
    if (!item.consent.name || !item.displayName?.trim()) continue;
    const voice: PublicStaffVoice = {anonymous: false, displayName: item.displayName, message: item.message};
    if (item.consent.role && item.roleLabel?.trim()) voice.roleLabel = item.roleLabel;
    const portrait = item.portrait;
    if (item.consent.portrait && portrait && isPublicHeroImage(portrait.src) && portrait.alt.trim() && portrait.width > 0 && portrait.height > 0) {
      voice.portrait = {src: portrait.src, alt: portrait.alt, width: portrait.width, height: portrait.height,
        requiredCredit: portrait.requiredCredit || '', source: portrait.source ? safeContentHref(portrait.source) || '' : ''};
    }
    result.push(voice);
  }
  return result;
}

export function getPublicStaffVoices() { return projectStaffVoices(contributions); }
