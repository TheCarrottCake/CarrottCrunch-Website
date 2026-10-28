-- Forward-only About Memories extension. Apply the whole file atomically.
-- No original table rename, schema-text edits, historical-row rewrites or seeds.
PRAGMA defer_foreign_keys = ON;

-- Remove only objects that depend directly or transitively on this table.
-- Their final 0012-compatible definitions are restored below before commit.
DROP TRIGGER studio_release_execution_once;
DROP TRIGGER studio_media_trash_guard;
DROP TRIGGER editorial_trash_protection;
DROP VIEW studio_active_media;
DROP VIEW active_editorial_media;

CREATE TABLE studio_documents_about_memories_new (
 id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN('announcement','event','homepage','banners','gallery','about-memories')),
 title TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published','scheduled','unpublished','archived')),
 live_release_id TEXT REFERENCES studio_releases(id) DEFERRABLE INITIALLY DEFERRED,
 pending_release_id TEXT REFERENCES studio_releases(id) DEFERRABLE INITIALLY DEFERRED,
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER
);
INSERT INTO studio_documents_about_memories_new
 (id,kind,title,revision,version,status,live_release_id,pending_release_id,created_at,updated_at,deleted_at)
 SELECT id,kind,title,revision,version,status,live_release_id,pending_release_id,created_at,updated_at,deleted_at FROM studio_documents;

-- Abort the atomic migration if a copied value differs in either direction.
CREATE TABLE about_memories_migration_assert (ok INTEGER NOT NULL CHECK(ok=1));
INSERT INTO about_memories_migration_assert SELECT CASE WHEN
 NOT EXISTS(SELECT * FROM studio_documents EXCEPT SELECT * FROM studio_documents_about_memories_new)
 AND NOT EXISTS(SELECT * FROM studio_documents_about_memories_new EXCEPT SELECT * FROM studio_documents)
 THEN 1 ELSE 0 END;

DROP TABLE studio_documents;
ALTER TABLE studio_documents_about_memories_new RENAME TO studio_documents;
CREATE INDEX studio_list ON studio_documents(kind,status,updated_at);
CREATE UNIQUE INDEX studio_single_collection ON studio_documents(kind)
 WHERE kind IN('homepage','banners','gallery','about-memories') AND deleted_at IS NULL;

CREATE TRIGGER studio_live_binding BEFORE UPDATE OF live_release_id,pending_release_id ON studio_documents
 WHEN (NEW.live_release_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM studio_releases r WHERE r.id=NEW.live_release_id AND r.document_id=NEW.id))
 OR (NEW.pending_release_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM studio_releases r WHERE r.id=NEW.pending_release_id AND r.document_id=NEW.id AND r.revision=NEW.revision AND r.executed_at IS NULL))
 BEGIN SELECT RAISE(ABORT,'Release must belong to this document and revision'); END;

CREATE TRIGGER studio_live_media_guard BEFORE UPDATE OF live_release_id ON studio_documents
 WHEN NEW.live_release_id IS NOT NULL AND NEW.live_release_id IS NOT OLD.live_release_id AND EXISTS(
 SELECT 1 FROM studio_releases r JOIN studio_media_references m ON m.document_id=r.document_id AND m.revision=r.revision
 JOIN media_assets a ON a.id=m.asset_id WHERE r.id=NEW.live_release_id
 AND (a.deleted_at IS NOT NULL OR a.publication_blocked=1 OR a.release_invalidated_at>=r.created_at OR a.rights_expires_at<=unixepoch()*1000))
 BEGIN SELECT RAISE(ABORT,'Image unavailable or restricted'); END;

CREATE TRIGGER studio_release_execution_once BEFORE UPDATE OF executed_at ON studio_releases
 WHEN OLD.executed_at IS NOT NULL OR NEW.executed_at IS NULL OR NOT EXISTS(
 SELECT 1 FROM studio_documents d WHERE d.id=NEW.document_id AND d.live_release_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'Release execution is immutable and must match the live document'); END;

CREATE VIEW studio_active_media AS
 SELECT DISTINCT m.asset_id,m.document_id,m.revision FROM studio_media_references m JOIN studio_documents d ON d.id=m.document_id
 WHERE d.deleted_at IS NULL AND ((d.status!='archived' AND d.revision=m.revision) OR EXISTS(
 SELECT 1 FROM studio_releases r WHERE r.id IN(d.live_release_id,d.pending_release_id) AND r.document_id=d.id AND r.revision=m.revision));

CREATE TRIGGER studio_media_trash_guard BEFORE UPDATE OF deleted_at ON media_assets
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM studio_active_media WHERE asset_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'Image is used by Content Studio'); END;

CREATE VIEW active_editorial_media AS
 SELECT DISTINCT m.content_id,m.revision,i.asset_id FROM content_revision_media m
 JOIN media_editorial_images i ON i.id=m.image_id JOIN content_workflows w ON w.content_id=m.content_id
 WHERE NOT EXISTS(SELECT 1 FROM studio_documents d WHERE d.id=m.content_id) AND ((w.status!='archived' AND w.editorial_revision=m.revision)
 OR EXISTS(SELECT 1 FROM content_releases r WHERE r.id IN(w.live_release_id,w.pending_release_id) AND r.content_id=m.content_id AND r.revision=m.revision))
 UNION SELECT u.content_id,u.revision,s.asset_id FROM content_revision_uploads u JOIN media_upload_submissions s ON s.id=u.submission_id
 JOIN content_workflows w ON w.content_id=u.content_id WHERE w.status!='archived' AND w.editorial_revision=u.revision AND NOT EXISTS(SELECT 1 FROM studio_documents d WHERE d.id=u.content_id);

CREATE TRIGGER editorial_trash_protection BEFORE UPDATE OF deleted_at ON media_assets
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM active_editorial_media WHERE asset_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'Image has working, scheduled or live references'); END;

-- Fail, rather than merely emit diagnostic rows, if integrity checks find a defect.
INSERT INTO about_memories_migration_assert SELECT CASE WHEN
 NOT EXISTS(SELECT 1 FROM pragma_foreign_key_check)
 THEN 1 ELSE 0 END;
DROP TABLE about_memories_migration_assert;
PRAGMA foreign_key_check;
-- D1 permits quick_check; full integrity_check is verified on an isolated SQLite mirror.
PRAGMA quick_check;
PRAGMA defer_foreign_keys = OFF;
