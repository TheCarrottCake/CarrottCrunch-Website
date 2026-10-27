-- Editorial snapshots stay immutable. Workflow actions do not renumber editorial revisions.
CREATE TABLE content_workflows (
 content_id TEXT PRIMARY KEY REFERENCES content_items(id) ON DELETE RESTRICT,
 editorial_revision INTEGER NOT NULL CHECK(editorial_revision>0),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','review','approved','scheduled','published','archived')),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 submission_id TEXT REFERENCES content_reviews(id) DEFERRABLE INITIALLY DEFERRED,
 approval_id TEXT REFERENCES content_reviews(id) DEFERRABLE INITIALLY DEFERRED,
 pending_release_id TEXT REFERENCES content_releases(id) DEFERRABLE INITIALLY DEFERRED,
 live_release_id TEXT REFERENCES content_releases(id) DEFERRABLE INITIALLY DEFERRED,
 live_at INTEGER CHECK(live_at IS NULL OR live_at>=0),
 CHECK((live_release_id IS NULL)=(live_at IS NULL))
);
CREATE TABLE content_reviews (
 id TEXT PRIMARY KEY, content_id TEXT NOT NULL REFERENCES content_items(id), revision INTEGER NOT NULL,
 action TEXT NOT NULL CHECK(action IN('submitted','approved','rejected')),
 submission_id TEXT REFERENCES content_reviews(id), actor_id TEXT NOT NULL, actor_name TEXT NOT NULL,
 actor_role TEXT NOT NULL CHECK(actor_role IN('Moderator','Administrator','Owner')),
 explanation TEXT NOT NULL DEFAULT '' CHECK(length(explanation)<=2000), created_at INTEGER NOT NULL,
 FOREIGN KEY(content_id,revision) REFERENCES content_revisions(content_id,revision),
 CHECK(action='submitted' OR (submission_id IS NOT NULL AND actor_role IN('Administrator','Owner')))
);
CREATE UNIQUE INDEX review_one_decision ON content_reviews(submission_id) WHERE action IN('approved','rejected');
CREATE TABLE content_releases (
 id TEXT PRIMARY KEY, content_id TEXT NOT NULL REFERENCES content_items(id), revision INTEGER NOT NULL,
 approval_id TEXT NOT NULL REFERENCES content_reviews(id), actor_id TEXT NOT NULL, actor_name TEXT NOT NULL,
 actor_role TEXT NOT NULL CHECK(actor_role IN('Administrator','Owner')),
 due_at INTEGER NOT NULL CHECK(typeof(due_at)='integer' AND due_at>=0), created_at INTEGER NOT NULL,
 FOREIGN KEY(content_id,revision) REFERENCES content_revisions(content_id,revision)
);
CREATE INDEX release_due ON content_releases(due_at,id);
CREATE INDEX workflow_queue ON content_workflows(status,content_id);
CREATE TRIGGER review_valid BEFORE INSERT ON content_reviews WHEN
 (NEW.action='submitted' AND NOT EXISTS(SELECT 1 FROM content_workflows w WHERE w.content_id=NEW.content_id AND w.editorial_revision=NEW.revision AND w.status='review' AND w.submission_id=NEW.id)) OR
 (NEW.action!='submitted' AND NOT EXISTS(SELECT 1 FROM content_reviews r WHERE r.id=NEW.submission_id AND r.content_id=NEW.content_id AND r.revision=NEW.revision AND r.action='submitted'))
 BEGIN SELECT RAISE(ABORT,'Invalid review revision'); END;
CREATE TRIGGER release_valid BEFORE INSERT ON content_releases WHEN NOT EXISTS(
 SELECT 1 FROM content_reviews r JOIN content_workflows w ON w.content_id=r.content_id
 WHERE r.id=NEW.approval_id AND r.action='approved' AND r.content_id=NEW.content_id AND r.revision=NEW.revision
 AND w.editorial_revision=NEW.revision AND w.approval_id=r.id)
 BEGIN SELECT RAISE(ABORT,'Explicit revision approval required'); END;
CREATE TRIGGER reviews_no_update BEFORE UPDATE ON content_reviews BEGIN SELECT RAISE(ABORT,'Reviews are append-only'); END;
CREATE TRIGGER reviews_no_delete BEFORE DELETE ON content_reviews BEGIN SELECT RAISE(ABORT,'Reviews are append-only'); END;
CREATE TRIGGER releases_no_update BEFORE UPDATE ON content_releases BEGIN SELECT RAISE(ABORT,'Releases are append-only'); END;
CREATE TRIGGER releases_no_delete BEFORE DELETE ON content_releases BEGIN SELECT RAISE(ABORT,'Releases are append-only'); END;
-- No approval is inferred from legacy state. Deployment requires an explicit inventory gate.
INSERT INTO content_workflows(content_id,editorial_revision,status)
 SELECT c.id,MAX(r.revision),CASE WHEN c.state='archived' THEN 'archived' ELSE 'draft' END
 FROM content_items c JOIN content_revisions r ON r.content_id=c.id WHERE c.is_fixture=0 GROUP BY c.id;
CREATE TRIGGER editorial_workflow AFTER INSERT ON content_revisions
 WHEN EXISTS(SELECT 1 FROM content_items WHERE id=NEW.content_id AND is_fixture=0)
 BEGIN
 INSERT INTO content_workflows(content_id,editorial_revision,status) VALUES(NEW.content_id,NEW.revision,
 CASE WHEN json_extract(NEW.snapshot_json,'$.state')='archived' THEN 'archived' ELSE 'draft' END)
 ON CONFLICT(content_id) DO UPDATE SET editorial_revision=NEW.revision,
 status=excluded.status,version=content_workflows.version+1,submission_id=NULL,approval_id=NULL,pending_release_id=NULL;
 END;
CREATE VIEW approved_public_content AS
 SELECT c.id,c.kind,c.slug,json_extract(s.snapshot_json,'$.title') AS title,
 json_extract(s.snapshot_json,'$.body_text') AS body_text,'published' AS state,c.is_fixture,w.live_at AS published_at,
 json_extract(s.snapshot_json,'$.starts_at') AS starts_at,json_extract(s.snapshot_json,'$.ends_at') AS ends_at,
 json_extract(s.snapshot_json,'$.timezone') AS timezone,json_extract(s.snapshot_json,'$.event_state') AS event_state
 FROM content_workflows w JOIN content_items c ON c.id=w.content_id
 JOIN content_releases l ON l.id=w.live_release_id AND l.content_id=c.id
 JOIN content_reviews a ON a.id=l.approval_id AND a.content_id=c.id AND a.revision=l.revision AND a.action='approved'
 JOIN content_revisions s ON s.content_id=c.id AND s.revision=l.revision WHERE c.is_fixture=0
 UNION ALL
 SELECT c.id,c.kind,c.slug,c.title,c.body_text,c.state,c.is_fixture,c.published_at,e.starts_at,e.ends_at,e.timezone,e.event_state
 FROM content_items c LEFT JOIN events e ON e.content_id=c.id WHERE c.is_fixture=1;
