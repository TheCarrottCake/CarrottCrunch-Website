-- History is append-only, including when accessed outside application utilities.
CREATE TRIGGER revisions_no_update BEFORE UPDATE ON content_revisions BEGIN
  SELECT RAISE(ABORT, 'Content revisions are append-only');
END;
CREATE TRIGGER revisions_no_delete BEFORE DELETE ON content_revisions BEGIN
  SELECT RAISE(ABORT, 'Content revisions are append-only');
END;
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_records BEGIN
  SELECT RAISE(ABORT, 'Audit records are append-only');
END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_records BEGIN
  SELECT RAISE(ABORT, 'Audit records are append-only');
END;
