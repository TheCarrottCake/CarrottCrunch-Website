-- Additive 05D. Existing revisions, permissions and stored objects are preserved.
CREATE TABLE media_editorial_grants (
 id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES media_assets(id),
 previous_id TEXT REFERENCES media_editorial_grants(id),
 status TEXT NOT NULL CHECK(status IN('approved','revoked','pending','rejected')),
 rights_holder TEXT NOT NULL, evidence TEXT NOT NULL, conditions TEXT NOT NULL DEFAULT '',
 expires_at INTEGER, actor_id TEXT NOT NULL, created_at INTEGER NOT NULL,
 CHECK(status!='approved' OR (length(trim(rights_holder))>0 AND length(trim(evidence))>0 AND length(trim(conditions))=0)),
 CHECK(expires_at IS NULL OR expires_at>created_at)
);
CREATE TABLE media_editorial_current (
 asset_id TEXT PRIMARY KEY REFERENCES media_assets(id), grant_id TEXT NOT NULL UNIQUE REFERENCES media_editorial_grants(id)
);
CREATE TRIGGER editorial_grant_authorized BEFORE INSERT ON media_editorial_grants
 WHEN NOT EXISTS(SELECT 1 FROM staff_accounts WHERE discord_user_id=NEW.actor_id AND active=1 AND role IN('Administrator','Owner'))
 OR COALESCE(NEW.previous_id,'')!=COALESCE((SELECT grant_id FROM media_editorial_current WHERE asset_id=NEW.asset_id),'')
 OR NOT EXISTS(SELECT 1 FROM media_assets WHERE id=NEW.asset_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'Editorial permission changed or unauthorized'); END;
CREATE TRIGGER editorial_grant_current AFTER INSERT ON media_editorial_grants BEGIN
 INSERT INTO media_editorial_current(asset_id,grant_id) VALUES(NEW.asset_id,NEW.id)
 ON CONFLICT(asset_id) DO UPDATE SET grant_id=excluded.grant_id;
END;
CREATE TRIGGER editorial_grants_immutable_update BEFORE UPDATE ON media_editorial_grants BEGIN SELECT RAISE(ABORT,'Consent history is immutable'); END;
CREATE TRIGGER editorial_grants_immutable_delete BEFORE DELETE ON media_editorial_grants BEGIN SELECT RAISE(ABORT,'Consent history is immutable'); END;
CREATE TABLE media_editorial_derivatives (
 id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES media_assets(id), source_sha TEXT NOT NULL,
 card_key TEXT NOT NULL UNIQUE, detail_key TEXT NOT NULL UNIQUE,
 card_sha TEXT NOT NULL CHECK(length(card_sha)=64), detail_sha TEXT NOT NULL CHECK(length(detail_sha)=64),
 card_width INTEGER NOT NULL CHECK(card_width BETWEEN 1 AND 480), card_height INTEGER NOT NULL CHECK(card_height BETWEEN 1 AND 480),
 width INTEGER NOT NULL CHECK(width BETWEEN 1 AND 1280), height INTEGER NOT NULL CHECK(height BETWEEN 1 AND 1280),
 created_at INTEGER NOT NULL,
 UNIQUE(asset_id,source_sha)
);
CREATE TRIGGER editorial_derivative_source BEFORE INSERT ON media_editorial_derivatives
 WHEN NOT EXISTS(SELECT 1 FROM media_assets WHERE id=NEW.asset_id AND sha256=NEW.source_sha AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'Image source changed'); END;
CREATE TRIGGER editorial_derivatives_immutable_update BEFORE UPDATE ON media_editorial_derivatives BEGIN SELECT RAISE(ABORT,'Derivatives are immutable'); END;
CREATE TRIGGER editorial_derivatives_immutable_delete BEFORE DELETE ON media_editorial_derivatives BEGIN SELECT RAISE(ABORT,'Derivatives are immutable'); END;
CREATE TRIGGER media_source_immutable BEFORE UPDATE OF original_key,preview_key,sha256,width,height,mime_type ON media_assets
 BEGIN SELECT RAISE(ABORT,'Upload a new asset to replace image bytes'); END;
CREATE TABLE media_editorial_images (
 id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES media_assets(id), grant_id TEXT NOT NULL REFERENCES media_editorial_grants(id),
 derivative_id TEXT NOT NULL REFERENCES media_editorial_derivatives(id), asset_version INTEGER NOT NULL,
 alt_text TEXT NOT NULL CHECK(length(trim(alt_text)) BETWEEN 1 AND 1000),
 creator_name TEXT NOT NULL, anonymous INTEGER NOT NULL CHECK(anonymous IN(0,1)), source_url TEXT NOT NULL,
 created_at INTEGER NOT NULL
);
CREATE TRIGGER editorial_image_valid BEFORE INSERT ON media_editorial_images
 WHEN NOT EXISTS(SELECT 1 FROM media_assets a JOIN media_attribution t ON t.asset_id=a.id
 JOIN media_editorial_current c ON c.asset_id=a.id JOIN media_editorial_grants g ON g.id=c.grant_id
 JOIN media_editorial_derivatives d ON d.asset_id=a.id
 WHERE a.id=NEW.asset_id AND a.version=NEW.asset_version AND a.deleted_at IS NULL
 AND g.id=NEW.grant_id AND g.status='approved' AND (g.expires_at IS NULL OR g.expires_at>NEW.created_at)
 AND d.id=NEW.derivative_id AND d.source_sha=a.sha256
 AND NEW.alt_text=a.alt_text AND length(trim(t.provenance))>0
 AND NEW.creator_name=t.creator_name AND NEW.anonymous=t.anonymous AND NEW.source_url=t.source_url
 AND (t.anonymous=1 OR length(trim(t.creator_name))>0))
 BEGIN SELECT RAISE(ABORT,'Image metadata or consent changed'); END;
CREATE TRIGGER editorial_images_immutable_update BEFORE UPDATE ON media_editorial_images BEGIN SELECT RAISE(ABORT,'Image presentations are immutable'); END;
CREATE TRIGGER editorial_images_immutable_delete BEFORE DELETE ON media_editorial_images BEGIN SELECT RAISE(ABORT,'Image presentations are immutable'); END;
-- Structural eligibility is shared by public queries and transactional guards.
CREATE VIEW editorial_media_ready AS
 SELECT i.*,g.expires_at,d.card_key,d.detail_key,d.card_sha,d.detail_sha,d.card_width,d.card_height,d.width,d.height
 FROM media_editorial_images i JOIN media_assets a ON a.id=i.asset_id
 JOIN media_editorial_current c ON c.asset_id=a.id AND c.grant_id=i.grant_id
 JOIN media_editorial_grants g ON g.id=c.grant_id AND g.status='approved'
 JOIN media_editorial_derivatives d ON d.id=i.derivative_id AND d.asset_id=a.id AND d.source_sha=a.sha256
 WHERE a.deleted_at IS NULL;
CREATE TABLE content_revision_media (
 content_id TEXT NOT NULL, revision INTEGER NOT NULL, image_id TEXT NOT NULL REFERENCES media_editorial_images(id),
 PRIMARY KEY(content_id,revision), FOREIGN KEY(content_id,revision) REFERENCES content_revisions(content_id,revision)
);
CREATE INDEX revision_media_image ON content_revision_media(image_id);
CREATE TRIGGER revision_media_validate BEFORE INSERT ON content_revisions
 WHEN json_extract(NEW.snapshot_json,'$.featured_image_id') IS NOT NULL AND NOT EXISTS(
 SELECT 1 FROM editorial_media_ready i WHERE i.id=json_extract(NEW.snapshot_json,'$.featured_image_id')
 AND (i.expires_at IS NULL OR i.expires_at>NEW.created_at))
 BEGIN SELECT RAISE(ABORT,'Featured image unavailable; remove or replace it'); END;
CREATE TRIGGER revision_media_capture AFTER INSERT ON content_revisions
 WHEN json_extract(NEW.snapshot_json,'$.featured_image_id') IS NOT NULL BEGIN
 INSERT INTO content_revision_media(content_id,revision,image_id) VALUES(NEW.content_id,NEW.revision,json_extract(NEW.snapshot_json,'$.featured_image_id'));
END;
CREATE TRIGGER revision_media_exact BEFORE INSERT ON content_revision_media
 WHEN NOT EXISTS(SELECT 1 FROM content_revisions WHERE content_id=NEW.content_id AND revision=NEW.revision
 AND json_extract(snapshot_json,'$.featured_image_id')=NEW.image_id)
 BEGIN SELECT RAISE(ABORT,'Media must match its editorial snapshot'); END;
CREATE TRIGGER revision_media_immutable_update BEFORE UPDATE ON content_revision_media BEGIN SELECT RAISE(ABORT,'Media bindings are immutable'); END;
CREATE TRIGGER revision_media_immutable_delete BEFORE DELETE ON content_revision_media BEGIN SELECT RAISE(ABORT,'Media bindings are immutable'); END;
CREATE VIEW active_editorial_media AS
 SELECT DISTINCT m.content_id,m.revision,i.asset_id FROM content_revision_media m
 JOIN media_editorial_images i ON i.id=m.image_id JOIN content_workflows w ON w.content_id=m.content_id
 WHERE (w.status!='archived' AND w.editorial_revision=m.revision)
 OR EXISTS(SELECT 1 FROM content_releases r WHERE r.id IN(w.live_release_id,w.pending_release_id) AND r.content_id=m.content_id AND r.revision=m.revision);
CREATE TRIGGER editorial_trash_protection BEFORE UPDATE OF deleted_at ON media_assets
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM active_editorial_media WHERE asset_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'Image has working, scheduled or live references'); END;
CREATE TRIGGER editorial_approval_media BEFORE INSERT ON content_reviews
 WHEN NEW.action IN('submitted','approved') AND EXISTS(SELECT 1 FROM content_revision_media m WHERE m.content_id=NEW.content_id AND m.revision=NEW.revision
 AND NOT EXISTS(SELECT 1 FROM editorial_media_ready i WHERE i.id=m.image_id AND (i.expires_at IS NULL OR i.expires_at>NEW.created_at)))
 BEGIN SELECT RAISE(ABORT,'Featured image consent unavailable'); END;
CREATE TRIGGER editorial_release_media BEFORE INSERT ON content_releases
 WHEN EXISTS(SELECT 1 FROM content_revision_media m WHERE m.content_id=NEW.content_id AND m.revision=NEW.revision
 AND NOT EXISTS(SELECT 1 FROM editorial_media_ready i WHERE i.id=m.image_id AND (i.expires_at IS NULL OR i.expires_at>MAX(NEW.created_at,NEW.due_at))))
 BEGIN SELECT RAISE(ABORT,'Featured image cannot be released at this time'); END;
CREATE TRIGGER editorial_live_media BEFORE UPDATE OF live_release_id ON content_workflows
 WHEN NEW.live_release_id IS NOT NULL AND NEW.live_release_id IS NOT OLD.live_release_id
 AND EXISTS(SELECT 1 FROM content_releases r JOIN content_revision_media m ON m.content_id=r.content_id AND m.revision=r.revision
 WHERE r.id=NEW.live_release_id AND NOT EXISTS(SELECT 1 FROM editorial_media_ready i WHERE i.id=m.image_id AND (i.expires_at IS NULL OR i.expires_at>NEW.live_at)))
 BEGIN SELECT RAISE(ABORT,'Featured image is unavailable for publication'); END;
