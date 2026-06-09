CREATE OR REPLACE FUNCTION compute_gist_search_vector(gist_id TEXT)
RETURNS tsvector AS $$
DECLARE
  gist_title TEXT;
  gist_desc TEXT;
  file_contents TEXT;
BEGIN
  SELECT title, COALESCE(description, '')
  INTO gist_title, gist_desc
  FROM "Gist" WHERE id = gist_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT string_agg(filename || ' ' || content, ' ')
  INTO file_contents
  FROM "GistFile"
  WHERE "gistId" = gist_id AND "revisionId" IS NULL;

  RETURN
    setweight(to_tsvector('english', COALESCE(gist_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(gist_desc, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(file_contents, '')), 'C');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_gist_search_vector_trigger()
RETURNS TRIGGER AS $$
DECLARE
  target_gist_id TEXT;
BEGIN
  IF TG_TABLE_NAME = 'GistFile' THEN
    IF TG_OP = 'DELETE' THEN
      IF OLD."revisionId" IS NOT NULL THEN
        RETURN OLD;
      END IF;
      target_gist_id := OLD."gistId";
    ELSE
      IF NEW."revisionId" IS NOT NULL THEN
        RETURN NEW;
      END IF;
      target_gist_id := NEW."gistId";
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    target_gist_id := NEW.id;
  END IF;

  UPDATE "Gist"
  SET "searchVector" = compute_gist_search_vector(target_gist_id)
  WHERE id = target_gist_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS gist_search_vector_trigger ON "Gist";
DROP TRIGGER IF EXISTS gist_file_search_vector_trigger ON "GistFile";

CREATE TRIGGER gist_search_vector_trigger
AFTER INSERT OR UPDATE OF title, description ON "Gist"
FOR EACH ROW EXECUTE FUNCTION update_gist_search_vector_trigger();

CREATE TRIGGER gist_file_search_vector_trigger
AFTER INSERT OR UPDATE OR DELETE ON "GistFile"
FOR EACH ROW EXECUTE FUNCTION update_gist_search_vector_trigger();

CREATE INDEX IF NOT EXISTS "Gist_searchVector_idx" ON "Gist" USING GIN ("searchVector");

UPDATE "Gist" SET "searchVector" = compute_gist_search_vector(id)
WHERE "searchVector" IS NULL;
