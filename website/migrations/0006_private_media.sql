-- Private originals and metadata-free previews. No public delivery or deletion jobs.
CREATE TABLE media_assets (
 id TEXT PRIMARY KEY, original_key TEXT NOT NULL UNIQUE, preview_key TEXT NOT NULL UNIQUE,
 mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
 byte_size INTEGER NOT NULL CHECK(byte_size BETWEEN 1 AND 20971520),
 sha256 TEXT NOT NULL CHECK(length(sha256)=64), width INTEGER NOT NULL CHECK(width>0), height INTEGER NOT NULL CHECK(height>0),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 160), description TEXT NOT NULL DEFAULT '', alt_text TEXT NOT NULL DEFAULT '',
 original_filename TEXT NOT NULL, uploaded_by TEXT NOT NULL,
 created_at INTEGER NOT NULL CHECK(created_at>=0), updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 deleted_at INTEGER, deleted_by TEXT, recover_until INTEGER,
 CHECK((deleted_at IS NULL AND deleted_by IS NULL AND recover_until IS NULL) OR
 (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND recover_until=deleted_at+2592000000))
);
CREATE INDEX media_browse ON media_assets(deleted_at,created_at DESC,id);
CREATE INDEX media_uploader ON media_assets(uploaded_by,created_at DESC);
CREATE TABLE media_attribution (
 asset_id TEXT PRIMARY KEY REFERENCES media_assets(id) ON DELETE RESTRICT,
 anonymous INTEGER NOT NULL DEFAULT 0 CHECK(anonymous IN(0,1)),
 creator_name TEXT NOT NULL DEFAULT '', source_url TEXT NOT NULL DEFAULT '', provenance TEXT NOT NULL DEFAULT ''
);
CREATE TABLE media_permissions (
 asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
 purpose TEXT NOT NULL CHECK(purpose IN('gallery','homepage','external')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','rejected','revoked')),
 rights_holder TEXT NOT NULL DEFAULT '', evidence TEXT NOT NULL DEFAULT '', conditions TEXT NOT NULL DEFAULT '',
 reviewed_by TEXT, reviewed_at INTEGER, expires_at INTEGER,
 PRIMARY KEY(asset_id,purpose),
 CHECK(status!='approved' OR (length(trim(rights_holder))>0 AND length(trim(evidence))>0 AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)),
 CHECK(expires_at IS NULL OR (reviewed_at IS NOT NULL AND expires_at>reviewed_at))
);
CREATE INDEX media_permission_review ON media_permissions(purpose,status,expires_at);
CREATE TABLE media_usage_references (
 id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
 content_id TEXT REFERENCES content_items(id) ON DELETE RESTRICT,
 purpose TEXT NOT NULL CHECK(purpose IN('gallery','homepage','external')),
 reference_label TEXT NOT NULL CHECK(length(trim(reference_label))>0), created_by TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX media_usage_asset ON media_usage_references(asset_id);
CREATE TRIGGER media_reference_requires_active BEFORE INSERT ON media_usage_references
 WHEN NOT EXISTS(SELECT 1 FROM media_assets WHERE id=NEW.asset_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'Media is unavailable'); END;
CREATE TRIGGER media_reference_update_requires_active BEFORE UPDATE OF asset_id ON media_usage_references
 WHEN NOT EXISTS(SELECT 1 FROM media_assets WHERE id=NEW.asset_id AND deleted_at IS NULL)
 BEGIN SELECT RAISE(ABORT,'Media is unavailable'); END;
CREATE TRIGGER media_delete_requires_unreferenced BEFORE UPDATE OF deleted_at ON media_assets
 WHEN NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM media_usage_references WHERE asset_id=NEW.id)
 BEGIN SELECT RAISE(ABORT,'Media is referenced'); END;
-- Assets remain recoverable; permanent erasure is deliberately outside this milestone.
CREATE TRIGGER media_no_hard_delete BEFORE DELETE ON media_assets
 BEGIN SELECT RAISE(ABORT,'Permanent media deletion is unavailable'); END;
