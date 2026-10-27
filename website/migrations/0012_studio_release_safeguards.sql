-- Forward-only hardening for the early 0011 schema already present locally.
-- Some late 0011 drafts added public_release_after and these triggers after
-- 0011 had been applied. A new field works with both variants without rerunning
-- ALTER statements or rewriting the migration ledger. The optional old field
-- is retained as historical compatibility data; V2 uses this field instead.
ALTER TABLE media_assets ADD COLUMN release_invalidated_at INTEGER NOT NULL DEFAULT 0;

DROP TRIGGER IF EXISTS studio_media_rights_change;
CREATE TRIGGER studio_media_rights_change AFTER UPDATE OF publication_blocked,rights_expires_at ON media_assets
 WHEN OLD.publication_blocked=1 OR NEW.publication_blocked=1 OR OLD.rights_expires_at<=unixepoch()*1000
 BEGIN UPDATE media_assets SET release_invalidated_at=MAX(release_invalidated_at,CAST(unixepoch('subsec')*1000 AS INTEGER)) WHERE id=NEW.id; END;

DROP TRIGGER IF EXISTS studio_release_execution_once;
CREATE TRIGGER studio_release_execution_once BEFORE UPDATE OF executed_at ON studio_releases
 WHEN OLD.executed_at IS NOT NULL OR NEW.executed_at IS NULL OR NOT EXISTS(
 SELECT 1 FROM studio_documents d WHERE d.id=NEW.document_id AND d.live_release_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'Release execution is immutable and must match the live document'); END;

DROP TRIGGER IF EXISTS studio_live_binding;
CREATE TRIGGER studio_live_binding BEFORE UPDATE OF live_release_id,pending_release_id ON studio_documents
 WHEN (NEW.live_release_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM studio_releases r WHERE r.id=NEW.live_release_id AND r.document_id=NEW.id))
 OR (NEW.pending_release_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM studio_releases r WHERE r.id=NEW.pending_release_id AND r.document_id=NEW.id AND r.revision=NEW.revision AND r.executed_at IS NULL))
 BEGIN SELECT RAISE(ABORT,'Release must belong to this document and revision'); END;

DROP TRIGGER IF EXISTS studio_release_media_guard;
CREATE TRIGGER studio_release_media_guard BEFORE INSERT ON studio_releases
 WHEN EXISTS(SELECT 1 FROM studio_media_references m JOIN media_assets a ON a.id=m.asset_id
 WHERE m.document_id=NEW.document_id AND m.revision=NEW.revision
 AND (a.deleted_at IS NOT NULL OR a.publication_blocked=1 OR a.release_invalidated_at>=NEW.created_at OR a.rights_expires_at<=MAX(NEW.created_at,NEW.due_at)))
 BEGIN SELECT RAISE(ABORT,'Image unavailable or restricted'); END;

DROP TRIGGER IF EXISTS studio_live_media_guard;
CREATE TRIGGER studio_live_media_guard BEFORE UPDATE OF live_release_id ON studio_documents
 WHEN NEW.live_release_id IS NOT NULL AND NEW.live_release_id IS NOT OLD.live_release_id AND EXISTS(
 SELECT 1 FROM studio_releases r JOIN studio_media_references m ON m.document_id=r.document_id AND m.revision=r.revision
 JOIN media_assets a ON a.id=m.asset_id WHERE r.id=NEW.live_release_id
 AND (a.deleted_at IS NOT NULL OR a.publication_blocked=1 OR a.release_invalidated_at>=r.created_at OR a.rights_expires_at<=unixepoch()*1000))
 BEGIN SELECT RAISE(ABORT,'Image unavailable or restricted'); END;
