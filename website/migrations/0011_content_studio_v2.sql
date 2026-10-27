-- Non-destructive V2 cutover. Legacy approvals/revisions remain historical records.
ALTER TABLE media_assets ADD COLUMN tags TEXT NOT NULL DEFAULT '';
ALTER TABLE media_assets ADD COLUMN internal_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE media_assets ADD COLUMN required_credit TEXT NOT NULL DEFAULT '';
ALTER TABLE media_assets ADD COLUMN publication_blocked INTEGER NOT NULL DEFAULT 0 CHECK(publication_blocked IN(0,1));
ALTER TABLE media_assets ADD COLUMN rights_expires_at INTEGER;
ALTER TABLE media_assets ADD COLUMN public_release_after INTEGER NOT NULL DEFAULT 0;
UPDATE media_assets SET rights_expires_at=(SELECT g.expires_at FROM media_editorial_current c JOIN media_editorial_grants g ON g.id=c.grant_id WHERE c.asset_id=media_assets.id);
UPDATE media_assets SET publication_blocked=1,internal_notes='Legacy permission was revoked, expired, or has unresolved conditions. Verify usage rights before publishing.'
 WHERE EXISTS(SELECT 1 FROM media_editorial_current c JOIN media_editorial_grants g ON g.id=c.grant_id WHERE c.asset_id=media_assets.id
 AND (g.status IN('revoked','rejected') OR length(trim(g.conditions))>0 OR g.expires_at<=unixepoch()*1000));
CREATE TABLE studio_documents (
 id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN('announcement','event','homepage','banners','gallery')),
 title TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published','scheduled','unpublished','archived')),
 live_release_id TEXT REFERENCES studio_releases(id) DEFERRABLE INITIALLY DEFERRED,
 pending_release_id TEXT REFERENCES studio_releases(id) DEFERRABLE INITIALLY DEFERRED,
 created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER
);
CREATE TABLE studio_revisions (
 document_id TEXT NOT NULL REFERENCES studio_documents(id),revision INTEGER NOT NULL,
 snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),actor_id TEXT NOT NULL,created_at INTEGER NOT NULL,
 PRIMARY KEY(document_id,revision)
);
CREATE TABLE studio_releases (
 id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES studio_documents(id),revision INTEGER NOT NULL,
 actor_id TEXT NOT NULL,created_at INTEGER NOT NULL,due_at INTEGER NOT NULL,executed_at INTEGER,legacy INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY(document_id,revision) REFERENCES studio_revisions(document_id,revision)
);
CREATE INDEX studio_list ON studio_documents(kind,status,updated_at);
CREATE UNIQUE INDEX studio_single_collection ON studio_documents(kind) WHERE kind IN('homepage','banners','gallery') AND deleted_at IS NULL;
CREATE INDEX studio_due ON studio_releases(due_at,id);
CREATE TABLE studio_media_references (
 document_id TEXT NOT NULL,revision INTEGER NOT NULL,placement TEXT NOT NULL,asset_id TEXT NOT NULL REFERENCES media_assets(id),
 PRIMARY KEY(document_id,revision,placement),FOREIGN KEY(document_id,revision) REFERENCES studio_revisions(document_id,revision)
);
CREATE INDEX studio_media_asset ON studio_media_references(asset_id);
CREATE TRIGGER studio_media_rights_change AFTER UPDATE OF publication_blocked,rights_expires_at ON media_assets
 WHEN OLD.publication_blocked=1 OR NEW.publication_blocked=1 OR OLD.rights_expires_at<=unixepoch()*1000
 BEGIN UPDATE media_assets SET public_release_after=MAX(public_release_after,CAST(unixepoch('subsec')*1000 AS INTEGER)) WHERE id=NEW.id; END;
INSERT INTO studio_documents(id,kind,title,revision,status,created_at,updated_at)
 SELECT c.id,c.kind,c.title,w.editorial_revision,CASE WHEN c.state='archived' THEN 'archived' WHEN w.status='scheduled' THEN 'scheduled'
 WHEN w.live_release_id IS NOT NULL THEN 'published' WHEN EXISTS(SELECT 1 FROM content_releases l WHERE l.content_id=c.id) THEN 'unpublished' ELSE 'draft' END,c.created_at,c.updated_at
 FROM content_items c JOIN content_workflows w ON w.content_id=c.id WHERE c.is_fixture=0;
INSERT INTO studio_revisions(document_id,revision,snapshot_json,actor_id,created_at)
 SELECT r.content_id,r.revision,json_set(r.snapshot_json,'$.coverId',COALESCE(
 (SELECT asset_id FROM media_editorial_images WHERE id=json_extract(r.snapshot_json,'$.featured_image_id')),
 (SELECT asset_id FROM media_upload_submissions WHERE id=json_extract(r.snapshot_json,'$.pending_image_id')),'')),r.actor_id,r.created_at
 FROM content_revisions r JOIN studio_documents d ON d.id=r.content_id;
INSERT INTO studio_releases(id,document_id,revision,actor_id,created_at,due_at,executed_at,legacy)
 SELECT l.id,l.content_id,l.revision,l.actor_id,l.created_at,l.due_at,CASE WHEN w.live_release_id=l.id THEN w.live_at ELSE NULL END,1
 FROM content_releases l JOIN studio_documents d ON d.id=l.content_id JOIN content_workflows w ON w.content_id=l.content_id;
UPDATE studio_documents SET live_release_id=(SELECT live_release_id FROM content_workflows WHERE content_id=studio_documents.id),
 pending_release_id=(SELECT pending_release_id FROM content_workflows WHERE content_id=studio_documents.id);
INSERT INTO studio_media_references(document_id,revision,placement,asset_id)
 SELECT document_id,revision,'cover',json_extract(snapshot_json,'$.coverId') FROM studio_revisions WHERE json_extract(snapshot_json,'$.coverId')!='';
CREATE TRIGGER studio_revision_no_update BEFORE UPDATE ON studio_revisions BEGIN SELECT RAISE(ABORT,'Studio revisions are immutable'); END;
CREATE TRIGGER studio_revision_no_delete BEFORE DELETE ON studio_revisions BEGIN SELECT RAISE(ABORT,'Studio history is retained'); END;
CREATE TRIGGER studio_release_no_delete BEFORE DELETE ON studio_releases BEGIN SELECT RAISE(ABORT,'Release history is retained'); END;
CREATE TRIGGER studio_release_no_change BEFORE UPDATE OF id,document_id,revision,actor_id,created_at,due_at,legacy ON studio_releases BEGIN SELECT RAISE(ABORT,'Release authorization is immutable'); END;
CREATE TRIGGER studio_release_execution_once BEFORE UPDATE OF executed_at ON studio_releases
 WHEN OLD.executed_at IS NOT NULL OR NEW.executed_at IS NULL OR NOT EXISTS(
 SELECT 1 FROM studio_documents d WHERE d.id=NEW.document_id AND d.live_release_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'Release execution is immutable and must match the live document'); END;
CREATE TRIGGER studio_live_binding BEFORE UPDATE OF live_release_id,pending_release_id ON studio_documents
 WHEN (NEW.live_release_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM studio_releases r WHERE r.id=NEW.live_release_id AND r.document_id=NEW.id))
 OR (NEW.pending_release_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM studio_releases r WHERE r.id=NEW.pending_release_id AND r.document_id=NEW.id AND r.revision=NEW.revision AND r.executed_at IS NULL))
 BEGIN SELECT RAISE(ABORT,'Release must belong to this document and revision'); END;
CREATE TRIGGER studio_reference_no_change BEFORE UPDATE ON studio_media_references BEGIN SELECT RAISE(ABORT,'Revision media is immutable'); END;
CREATE TRIGGER studio_reference_no_delete BEFORE DELETE ON studio_media_references BEGIN SELECT RAISE(ABORT,'Revision media is retained'); END;
CREATE TRIGGER studio_reference_valid BEFORE INSERT ON studio_media_references
 WHEN NOT EXISTS(SELECT 1 FROM studio_revisions r,json_each(r.snapshot_json,'$.media') m WHERE r.document_id=NEW.document_id AND r.revision=NEW.revision
 AND json_extract(m.value,'$.placement')=NEW.placement AND json_extract(m.value,'$.assetId')=NEW.asset_id)
 BEGIN SELECT RAISE(ABORT,'Media must match its revision manifest'); END;
CREATE TRIGGER studio_capture_media AFTER INSERT ON studio_revisions BEGIN
 INSERT INTO studio_media_references(document_id,revision,placement,asset_id)
 SELECT NEW.document_id,NEW.revision,json_extract(value,'$.placement'),json_extract(value,'$.assetId') FROM json_each(NEW.snapshot_json,'$.media');
END;
CREATE TRIGGER studio_asset_active BEFORE INSERT ON studio_media_references
 WHEN NOT EXISTS(SELECT 1 FROM media_assets WHERE id=NEW.asset_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'Referenced image is unavailable'); END;
CREATE VIEW studio_active_media AS
 SELECT DISTINCT m.asset_id,m.document_id,m.revision FROM studio_media_references m JOIN studio_documents d ON d.id=m.document_id
 WHERE d.deleted_at IS NULL AND ((d.status!='archived' AND d.revision=m.revision) OR EXISTS(
 SELECT 1 FROM studio_releases r WHERE r.id IN(d.live_release_id,d.pending_release_id) AND r.document_id=d.id AND r.revision=m.revision));
CREATE TRIGGER studio_media_trash_guard BEFORE UPDATE OF deleted_at ON media_assets
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM studio_active_media WHERE asset_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'Image is used by Content Studio'); END;
CREATE TRIGGER studio_release_media_guard BEFORE INSERT ON studio_releases
 WHEN EXISTS(SELECT 1 FROM studio_media_references m JOIN media_assets a ON a.id=m.asset_id WHERE m.document_id=NEW.document_id AND m.revision=NEW.revision AND (a.deleted_at IS NOT NULL OR a.publication_blocked=1 OR a.public_release_after>=NEW.created_at OR a.rights_expires_at<=MAX(NEW.created_at,NEW.due_at)))
 BEGIN SELECT RAISE(ABORT,'Image unavailable or restricted'); END;
CREATE TRIGGER studio_live_media_guard BEFORE UPDATE OF live_release_id ON studio_documents
 WHEN NEW.live_release_id IS NOT NULL AND NEW.live_release_id IS NOT OLD.live_release_id AND EXISTS(
 SELECT 1 FROM studio_releases r JOIN studio_media_references m ON m.document_id=r.document_id AND m.revision=r.revision JOIN media_assets a ON a.id=m.asset_id
 WHERE r.id=NEW.live_release_id AND (a.deleted_at IS NOT NULL OR a.publication_blocked=1 OR a.public_release_after>=r.created_at OR a.rights_expires_at<=unixepoch()*1000))
 BEGIN SELECT RAISE(ABORT,'Image unavailable or restricted'); END;
-- Active migrated documents are governed by V2 references, not obsolete working pointers.
DROP VIEW active_editorial_media;
CREATE VIEW active_editorial_media AS
 SELECT DISTINCT m.content_id,m.revision,i.asset_id FROM content_revision_media m
 JOIN media_editorial_images i ON i.id=m.image_id JOIN content_workflows w ON w.content_id=m.content_id
 WHERE NOT EXISTS(SELECT 1 FROM studio_documents d WHERE d.id=m.content_id) AND ((w.status!='archived' AND w.editorial_revision=m.revision)
 OR EXISTS(SELECT 1 FROM content_releases r WHERE r.id IN(w.live_release_id,w.pending_release_id) AND r.content_id=m.content_id AND r.revision=m.revision))
 UNION SELECT u.content_id,u.revision,s.asset_id FROM content_revision_uploads u JOIN media_upload_submissions s ON s.id=u.submission_id
 JOIN content_workflows w ON w.content_id=u.content_id WHERE w.status!='archived' AND w.editorial_revision=u.revision AND NOT EXISTS(SELECT 1 FROM studio_documents d WHERE d.id=u.content_id);
