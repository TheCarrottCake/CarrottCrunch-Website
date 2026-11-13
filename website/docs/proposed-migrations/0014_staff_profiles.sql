-- DRAFT ONLY: owner approval required before copying to migrations/ or applying to persistent D1.
-- Additive: no seed, account update, old-table rewrite or R2 operation.
CREATE TABLE staff_profiles (
  public_id TEXT PRIMARY KEY NOT NULL CHECK(length(public_id)=36),
  owner_id TEXT NOT NULL UNIQUE REFERENCES staff_accounts(discord_user_id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
  display_name TEXT NOT NULL DEFAULT '' CHECK(length(display_name)<=80),
  biography TEXT NOT NULL DEFAULT '' CHECK(length(biography)<=1500),
  portrait_asset TEXT REFERENCES media_assets(id) ON DELETE RESTRICT,
  portrait_alt TEXT NOT NULL DEFAULT '' CHECK(length(portrait_alt)<=200),
  consent_id TEXT,
  live_release_id TEXT,
  updated_at INTEGER NOT NULL
);
CREATE TABLE staff_profile_consents (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id)=36),
  profile_id TEXT NOT NULL REFERENCES staff_profiles(public_id) ON DELETE RESTRICT,
  actor_id TEXT NOT NULL REFERENCES staff_accounts(discord_user_id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 80),
  role TEXT NOT NULL CHECK(role IN('Moderator','Administrator','Owner')),
  access_version INTEGER NOT NULL,
  biography TEXT NOT NULL CHECK(length(biography)<=1500),
  portrait_asset TEXT REFERENCES media_assets(id) ON DELETE RESTRICT,
  portrait_alt TEXT NOT NULL,
  portrait_sha TEXT,
  derivative_id TEXT REFERENCES media_editorial_derivatives(id) ON DELETE RESTRICT,
  consent_name INTEGER NOT NULL CHECK(consent_name=1),
  consent_role INTEGER NOT NULL CHECK(consent_role=1),
  consent_biography INTEGER NOT NULL CHECK(consent_biography IN(0,1)),
  consent_portrait INTEGER NOT NULL CHECK(consent_portrait IN(0,1)),
  created_at INTEGER NOT NULL,
  CHECK(consent_biography=1 OR biography=''),
  CHECK((consent_portrait=0 AND portrait_asset IS NULL AND portrait_sha IS NULL AND derivative_id IS NULL AND portrait_alt='') OR
        (consent_portrait=1 AND portrait_asset IS NOT NULL AND portrait_sha IS NOT NULL AND derivative_id IS NOT NULL AND length(trim(portrait_alt))>0))
);
CREATE INDEX staff_profile_consent_profile ON staff_profile_consents(profile_id,created_at);
CREATE TABLE staff_profile_releases (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id)=36),
  profile_id TEXT NOT NULL REFERENCES staff_profiles(public_id) ON DELETE RESTRICT,
  consent_id TEXT NOT NULL REFERENCES staff_profile_consents(id) ON DELETE RESTRICT,
  actor_id TEXT NOT NULL REFERENCES staff_accounts(discord_user_id) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL
);
CREATE TRIGGER staff_profile_consent_no_update BEFORE UPDATE ON staff_profile_consents BEGIN SELECT RAISE(ABORT,'Profile consent is append-only'); END;
CREATE TRIGGER staff_profile_consent_no_delete BEFORE DELETE ON staff_profile_consents BEGIN SELECT RAISE(ABORT,'Profile consent is append-only'); END;
CREATE TRIGGER staff_profile_release_no_update BEFORE UPDATE ON staff_profile_releases BEGIN SELECT RAISE(ABORT,'Profile releases are append-only'); END;
CREATE TRIGGER staff_profile_release_no_delete BEFORE DELETE ON staff_profile_releases BEGIN SELECT RAISE(ABORT,'Profile releases are append-only'); END;
-- Role/access cycles never resurrect a prior public profile or consent.
CREATE TRIGGER staff_profile_access_changed AFTER UPDATE OF role,active ON staff_accounts
WHEN OLD.role<>NEW.role OR OLD.active<>NEW.active BEGIN
 UPDATE staff_profiles SET version=version+1,consent_id=NULL,live_release_id=NULL WHERE owner_id=NEW.discord_user_id;
END;
CREATE TRIGGER staff_profile_media_trash_guard BEFORE UPDATE OF deleted_at ON media_assets
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND (
 EXISTS(SELECT 1 FROM staff_profiles WHERE portrait_asset=NEW.id) OR
 EXISTS(SELECT 1 FROM staff_profiles p JOIN staff_profile_consents c ON c.id=p.consent_id WHERE c.portrait_asset=NEW.id)
) BEGIN SELECT RAISE(ABORT,'Image is referenced by a staff profile; remove the profile attachment first'); END;

-- Bind immutable evidence to the actual owner's exact saved fields and current role.
CREATE TRIGGER staff_profile_consent_guard BEFORE INSERT ON staff_profile_consents
WHEN NOT EXISTS(SELECT 1 FROM staff_profiles p JOIN staff_accounts a ON a.discord_user_id=p.owner_id
 WHERE p.public_id=NEW.profile_id AND p.owner_id=NEW.actor_id AND p.consent_id=NEW.id
 AND a.active=1 AND a.role=NEW.role AND a.access_version=NEW.access_version
 AND p.display_name=NEW.display_name AND (NEW.consent_biography=0 OR p.biography=NEW.biography)
 AND (NEW.consent_portrait=0 OR (p.portrait_asset=NEW.portrait_asset AND p.portrait_alt=NEW.portrait_alt)))
BEGIN SELECT RAISE(ABORT,'Profile consent does not match the current owner draft and role'); END;
CREATE TRIGGER staff_profile_release_guard BEFORE INSERT ON staff_profile_releases
WHEN NOT EXISTS(SELECT 1 FROM staff_profiles p JOIN staff_profile_consents c ON c.id=p.consent_id
 JOIN staff_accounts subject ON subject.discord_user_id=p.owner_id
 JOIN staff_accounts publisher ON publisher.discord_user_id=NEW.actor_id
 WHERE p.public_id=NEW.profile_id AND p.live_release_id=NEW.id AND c.id=NEW.consent_id
 AND c.profile_id=p.public_id AND subject.active=1 AND subject.role=c.role AND subject.access_version=c.access_version
 AND publisher.active=1 AND publisher.role IN('Administrator','Owner')
 AND (c.portrait_asset IS NULL OR EXISTS(SELECT 1 FROM media_assets m JOIN media_editorial_derivatives d ON d.id=c.derivative_id AND d.asset_id=m.id AND d.source_sha=m.sha256
 WHERE m.id=c.portrait_asset AND m.sha256=c.portrait_sha AND m.deleted_at IS NULL AND m.publication_blocked=0
 AND m.release_invalidated_at<c.created_at AND (m.rights_expires_at IS NULL OR m.rights_expires_at>NEW.created_at))))
BEGIN SELECT RAISE(ABORT,'Profile release requires exact consent, active staff and authorized publication'); END;
