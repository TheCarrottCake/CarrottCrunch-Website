import type { MediaAsset, MediaPermission, MediaPurpose } from './media-db.server';
/** Future publishers must re-check current consent, references and sanitized delivery at publication time. */
export function publicationEligibility(asset: MediaAsset, permissions: MediaPermission[], purpose: MediaPurpose, now = Date.now()) {
  const approval = permissions.find(permission => permission.purpose === purpose);
  const reasons: string[] = [];
  if (asset.deleted_at !== null) reasons.push('Image is in trash.');
  if (!asset.alt_text.trim()) reasons.push('Alt text is missing.');
  if (!asset.provenance.trim() || (!asset.anonymous && !asset.creator_name.trim())) reasons.push('Attribution or provenance is incomplete.');
  if (!approval || approval.status !== 'approved' || !approval.rights_holder.trim() || !approval.evidence.trim() || !approval.reviewed_by || approval.reviewed_at === null || approval.reviewed_at > now) reasons.push('Verified approval is missing.');
  if (approval?.expires_at !== null && approval?.expires_at !== undefined && approval.expires_at <= now) reasons.push('Permission has expired.');
  if (approval?.conditions.trim()) reasons.push('Recorded conditions require a publication review.');
  return { eligible: reasons.length === 0, reasons };
}
