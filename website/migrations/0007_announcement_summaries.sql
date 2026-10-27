-- Additive only: existing announcements, events, revisions and audits are preserved.
-- Historical snapshots remain immutable; an absent summary means an empty summary.
ALTER TABLE announcements ADD COLUMN summary TEXT NOT NULL DEFAULT '' CHECK (length(summary) <= 600);
