-- Private upload submissions do not authorize public use or mutate existing 05D bindings.
CREATE TABLE media_upload_submissions (
 id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES media_assets(id), asset_version INTEGER NOT NULL,
 alt_text TEXT NOT NULL, creator_name TEXT NOT NULL, source_url TEXT NOT NULL,
 rights_kind TEXT NOT NULL CHECK(rights_kind IN('own','licensed')),
 rights_holder TEXT NOT NULL CHECK(length(trim(rights_holder))>0), evidence TEXT NOT NULL CHECK(length(trim(evidence))>0),
 conditions TEXT NOT NULL DEFAULT '', submitted_by TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TRIGGER media_submission_valid BEFORE INSERT ON media_upload_submissions
 WHEN NOT EXISTS(SELECT 1 FROM media_assets a JOIN media_attribution t ON t.asset_id=a.id
 WHERE a.id=NEW.asset_id AND a.version=NEW.asset_version AND a.deleted_at IS NULL
 AND a.alt_text=NEW.alt_text AND t.creator_name=NEW.creator_name AND t.source_url=NEW.source_url)
 OR NOT EXISTS(SELECT 1 FROM staff_accounts WHERE discord_user_id=NEW.submitted_by AND active=1 AND role IN('Moderator','Administrator','Owner'))
 BEGIN SELECT RAISE(ABORT,'Upload submission changed or unauthorized'); END;
CREATE TRIGGER media_submission_no_update BEFORE UPDATE ON media_upload_submissions BEGIN SELECT RAISE(ABORT,'Upload evidence is immutable'); END;
CREATE TRIGGER media_submission_no_delete BEFORE DELETE ON media_upload_submissions BEGIN SELECT RAISE(ABORT,'Upload evidence is immutable'); END;
CREATE TABLE content_revision_uploads (
 content_id TEXT NOT NULL, revision INTEGER NOT NULL, submission_id TEXT NOT NULL REFERENCES media_upload_submissions(id),
 PRIMARY KEY(content_id,revision), FOREIGN KEY(content_id,revision) REFERENCES content_revisions(content_id,revision)
);
CREATE TRIGGER pending_image_validate BEFORE INSERT ON content_revisions
 WHEN json_extract(NEW.snapshot_json,'$.pending_image_id') IS NOT NULL AND (
 json_extract(NEW.snapshot_json,'$.featured_image_id') IS NOT NULL OR NOT EXISTS(
 SELECT 1 FROM media_upload_submissions s JOIN media_assets a ON a.id=s.asset_id
 WHERE s.id=json_extract(NEW.snapshot_json,'$.pending_image_id') AND a.deleted_at IS NULL AND a.version=s.asset_version))
 BEGIN SELECT RAISE(ABORT,'Pending image unavailable; replace or remove it'); END;
CREATE TRIGGER pending_image_capture AFTER INSERT ON content_revisions
 WHEN json_extract(NEW.snapshot_json,'$.pending_image_id') IS NOT NULL BEGIN
 INSERT INTO content_revision_uploads(content_id,revision,submission_id) VALUES(NEW.content_id,NEW.revision,json_extract(NEW.snapshot_json,'$.pending_image_id'));
END;
CREATE TRIGGER pending_binding_exact BEFORE INSERT ON content_revision_uploads
 WHEN NOT EXISTS(SELECT 1 FROM content_revisions WHERE content_id=NEW.content_id AND revision=NEW.revision AND json_extract(snapshot_json,'$.pending_image_id')=NEW.submission_id)
 BEGIN SELECT RAISE(ABORT,'Upload must match its editorial revision'); END;
CREATE TRIGGER pending_binding_no_update BEFORE UPDATE ON content_revision_uploads BEGIN SELECT RAISE(ABORT,'Upload bindings are immutable'); END;
CREATE TRIGGER pending_binding_no_delete BEFORE DELETE ON content_revision_uploads BEGIN SELECT RAISE(ABORT,'Upload bindings are immutable'); END;
-- Existing trash trigger and usage-count queries now also protect saved pending uploads.
DROP VIEW active_editorial_media;
CREATE VIEW active_editorial_media AS
 SELECT DISTINCT m.content_id,m.revision,i.asset_id FROM content_revision_media m
 JOIN media_editorial_images i ON i.id=m.image_id JOIN content_workflows w ON w.content_id=m.content_id
 WHERE (w.status!='archived' AND w.editorial_revision=m.revision)
 OR EXISTS(SELECT 1 FROM content_releases r WHERE r.id IN(w.live_release_id,w.pending_release_id) AND r.content_id=m.content_id AND r.revision=m.revision)
 UNION
 SELECT u.content_id,u.revision,s.asset_id FROM content_revision_uploads u
 JOIN media_upload_submissions s ON s.id=u.submission_id JOIN content_workflows w ON w.content_id=u.content_id
 WHERE w.status!='archived' AND w.editorial_revision=u.revision;
CREATE TRIGGER pending_image_blocks_approval BEFORE INSERT ON content_reviews
 WHEN NEW.action='approved' AND EXISTS(SELECT 1 FROM content_revision_uploads WHERE content_id=NEW.content_id AND revision=NEW.revision)
 BEGIN SELECT RAISE(ABORT,'Review and authorize the uploaded image, then save a new revision'); END;
CREATE TRIGGER pending_image_blocks_release BEFORE INSERT ON content_releases
 WHEN EXISTS(SELECT 1 FROM content_revision_uploads WHERE content_id=NEW.content_id AND revision=NEW.revision)
 BEGIN SELECT RAISE(ABORT,'Pending uploads cannot be published'); END;
CREATE TRIGGER pending_image_blocks_live BEFORE UPDATE OF live_release_id ON content_workflows
 WHEN NEW.live_release_id IS NOT NULL AND NEW.live_release_id IS NOT OLD.live_release_id
 AND EXISTS(SELECT 1 FROM content_releases r JOIN content_revision_uploads u ON u.content_id=r.content_id AND u.revision=r.revision WHERE r.id=NEW.live_release_id)
 BEGIN SELECT RAISE(ABORT,'Pending uploads cannot become public'); END;
