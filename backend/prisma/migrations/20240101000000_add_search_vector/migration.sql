-- Create function to update gist search vector
CREATE OR REPLACE FUNCTION update_gist_search_vector(gist_id text)
RETURNS void AS $$
DECLARE
    gist_title text;
    gist_description text;
    file_content text;
BEGIN
    -- Get gist title and description
    SELECT title, COALESCE(description, '') INTO gist_title, gist_description
    FROM "Gist"
    WHERE id = gist_id;

    -- Aggregate all file contents and filenames
    SELECT COALESCE(string_agg(filename || ' ' || content, ' '), '') INTO file_content
    FROM "GistFile"
    WHERE "gistId" = gist_id AND "revisionId" IS NULL;

    -- Update search vector with weighted tokens
    -- A weight = title (highest)
    -- B weight = description
    -- C weight = file content (lowest)
    UPDATE "Gist"
    SET "searchVector" =
        setweight(to_tsvector('english', COALESCE(gist_title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(gist_description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(file_content, '')), 'C')
    WHERE id = gist_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for gist table
CREATE OR REPLACE FUNCTION gist_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
    PERFORM update_gist_search_vector(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for gist_file table
CREATE OR REPLACE FUNCTION gist_file_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_gist_search_vector(OLD."gistId");
        RETURN OLD;
    ELSE
        PERFORM update_gist_search_vector(NEW."gistId");
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create GIN index on searchVector
CREATE INDEX IF NOT EXISTS gist_search_vector_idx ON "Gist" USING GIN ("searchVector");

-- Create triggers on Gist table
DROP TRIGGER IF EXISTS trg_gist_search_vector ON "Gist";
CREATE TRIGGER trg_gist_search_vector
AFTER INSERT OR UPDATE OF title, description ON "Gist"
FOR EACH ROW
EXECUTE FUNCTION gist_search_vector_trigger();

-- Create triggers on GistFile table
DROP TRIGGER IF EXISTS trg_gist_file_search_vector ON "GistFile";
CREATE TRIGGER trg_gist_file_search_vector
AFTER INSERT OR UPDATE OR DELETE ON "GistFile"
FOR EACH ROW
EXECUTE FUNCTION gist_file_search_vector_trigger();

-- Initialize search vectors for all existing gists
DO $$
DECLARE
    gist_record record;
BEGIN
    FOR gist_record IN SELECT id FROM "Gist"
    LOOP
        PERFORM update_gist_search_vector(gist_record.id);
    END LOOP;
END $$;
