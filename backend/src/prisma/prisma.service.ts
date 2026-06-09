import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureGistSearchInfrastructure();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Idempotently provision the full-text search infrastructure for Gists:
   * - GIN index on Gist.searchVector
   * - A helper function that recomputes searchVector (title=A, description=B, files=C)
   * - Triggers on Gist (title/description changes) and GistFile (insert/update/delete)
   *   so the vector stays in sync automatically.
   * - One-time backfill of any rows that still have a NULL vector.
   */
  private async ensureGistSearchInfrastructure() {
    try {
      await this.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "gist_search_vector_idx" ON "Gist" USING GIN ("searchVector");`,
      );

      await this.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION gist_refresh_search_vector(g_id text) RETURNS void AS $func$
        BEGIN
          UPDATE "Gist" g SET "searchVector" =
            setweight(to_tsvector('simple', coalesce(g.title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(g.description, '')), 'B') ||
            setweight(to_tsvector('simple', coalesce((
              SELECT string_agg(f.filename || ' ' || f.content, ' ')
              FROM "GistFile" f
              WHERE f."gistId" = g.id AND f."revisionId" IS NULL
            ), '')), 'C')
          WHERE g.id = g_id;
        END;
        $func$ LANGUAGE plpgsql;
      `);

      await this.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION gist_search_vector_trigger() RETURNS trigger AS $func$
        BEGIN
          PERFORM gist_refresh_search_vector(NEW.id);
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
      `);

      await this.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS gist_search_vector_update ON "Gist";`,
      );
      await this.$executeRawUnsafe(`
        CREATE TRIGGER gist_search_vector_update
        AFTER INSERT OR UPDATE OF title, description ON "Gist"
        FOR EACH ROW EXECUTE FUNCTION gist_search_vector_trigger();
      `);

      await this.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION gist_file_search_vector_trigger() RETURNS trigger AS $func$
        DECLARE
          target_gist_id text;
        BEGIN
          IF (TG_OP = 'DELETE') THEN
            target_gist_id := OLD."gistId";
          ELSE
            target_gist_id := NEW."gistId";
          END IF;
          PERFORM gist_refresh_search_vector(target_gist_id);
          IF (TG_OP = 'DELETE') THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $func$ LANGUAGE plpgsql;
      `);

      await this.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS gist_file_search_vector_update ON "GistFile";`,
      );
      await this.$executeRawUnsafe(`
        CREATE TRIGGER gist_file_search_vector_update
        AFTER INSERT OR UPDATE OR DELETE ON "GistFile"
        FOR EACH ROW EXECUTE FUNCTION gist_file_search_vector_trigger();
      `);

      // Backfill any rows whose vector has not been computed yet.
      await this.$executeRawUnsafe(`
        UPDATE "Gist" g SET "searchVector" =
          setweight(to_tsvector('simple', coalesce(g.title, '')), 'A') ||
          setweight(to_tsvector('simple', coalesce(g.description, '')), 'B') ||
          setweight(to_tsvector('simple', coalesce((
            SELECT string_agg(f.filename || ' ' || f.content, ' ')
            FROM "GistFile" f
            WHERE f."gistId" = g.id AND f."revisionId" IS NULL
          ), '')), 'C')
        WHERE g."searchVector" IS NULL;
      `);
    } catch (err) {
      this.logger.error('Failed to provision Gist search infrastructure', err as Error);
      throw err;
    }
  }
}
