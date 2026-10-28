/** Only explicitly public, consented fields may cross the About loader boundary. */
export type StaffVoicePortrait = {src: string; alt: string; width: number; height: number; requiredCredit?: string; source?: string};
export type PublicStaffVoice = {anonymous: boolean; displayName: string; message: string; roleLabel?: string; portrait?: StaffVoicePortrait};
