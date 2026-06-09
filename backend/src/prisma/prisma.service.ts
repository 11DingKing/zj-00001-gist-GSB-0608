import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.initSearchVector();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async initSearchVector() {
    try {
      this.logger.log('Initializing search vector...');

      await this.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION update_gist_search_vector(gist_id text)
        RETURNS void AS $$
        DECLARE
            gist_title text;
            gist_description text;
            file_content text;
        BEGIN
            SELECT title, COALESCE(description, '') INTO gist_title, gist_description
            FROM "Gist"
            WHERE id = gist_id;

            SELECT COALESCE(string_agg(filename || ' ' || content, ' '), '') INTO file_content
            FROM "GistFile"
            WHERE "gistId" = gist_id AND "revisionId" IS NULL;

            UPDATE "Gist"
            SET "searchVector" =
                setweight(to_tsvector('english', COALESCE(gist_title, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(gist_description, '')), 'B') ||
                setweight(to_tsvector('english', COALESCE(file_content, '')), 'C')
            WHERE id = gist_id;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await this.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION gist_search_vector_trigger()
        RETURNS trigger AS $$
        BEGIN
            PERFORM update_gist_search_vector(NEW.id);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await this.$executeRawUnsafe(`
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
      `);

      await this.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS gist_search_vector_idx ON "Gist" USING GIN ("searchVector");
      `);

      await this.$executeRawUnsafe(`
        DROP TRIGGER IF EXISTS trg_gist_search_vector ON "Gist";
        CREATE TRIGGER trg_gist_search_vector
        AFTER INSERT OR UPDATE OF title, description ON "Gist"
        FOR EACH ROW
        EXECUTE FUNCTION gist_search_vector_trigger();
      `);

      await this.$executeRawUnsafe(`
        DROP TRIGGER IF EXISTS trg_gist_file_search_vector ON "GistFile";
        CREATE TRIGGER trg_gist_file_search_vector
        AFTER INSERT OR UPDATE OR DELETE ON "GistFile"
        FOR EACH ROW
        EXECUTE FUNCTION gist_file_search_vector_trigger();
      `);

      const countResult = await this.$queryRawUnsafe<any>(
        `SELECT COUNT(*)::int as count FROM "Gist" WHERE "searchVector" IS NULL`
      );
      const nullCount = Array.isArray(countResult) ? countResult[0]?.count : 0;

      if (nullCount > 0) {
        this.logger.log(`Found ${nullCount} gists with null search vector, initializing...`);
        await this.$executeRawUnsafe(`
          DO $$
          DECLARE
              gist_record record;
          BEGIN
              FOR gist_record IN SELECT id FROM "Gist" WHERE "searchVector" IS NULL
              LOOP
                  PERFORM update_gist_search_vector(gist_record.id);
              END LOOP;
          END $$;
        `);
        this.logger.log('Search vectors initialized for all gists');
      }

      this.logger.log('Search vector initialization completed');
    } catch (error) {
      this.logger.error('Failed to initialize search vector', error);
    }
  }
}
