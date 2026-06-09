import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.ensureSearchVectorSetup();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureSearchVectorSetup() {
    await this.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION gist_search_vector_gist_update() RETURNS trigger AS $$
      DECLARE
        files_vec tsvector;
      BEGIN
        SELECT COALESCE(
          setweight(to_tsvector('english', string_agg(gf.filename, ' ')), 'C') ||
          setweight(to_tsvector('english', string_agg(gf.content, ' ')), 'D'),
          ''::tsvector
        )
        INTO files_vec
        FROM "GistFile" gf
        WHERE gf."gistId" = NEW.id AND gf."revisionId" IS NULL;

        NEW."searchVector" :=
          setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
          files_vec;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await this.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION gist_search_vector_file_update() RETURNS trigger AS $$
      DECLARE
        target_gist_id text;
        title_vec tsvector;
        desc_vec tsvector;
        files_vec tsvector;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          target_gist_id := OLD."gistId";
        ELSE
          target_gist_id := NEW."gistId";
        END IF;

        SELECT COALESCE(
          setweight(to_tsvector('english', string_agg(gf.filename, ' ')), 'C') ||
          setweight(to_tsvector('english', string_agg(gf.content, ' ')), 'D'),
          ''::tsvector
        )
        INTO files_vec
        FROM "GistFile" gf
        WHERE gf."gistId" = target_gist_id AND gf."revisionId" IS NULL;

        SELECT setweight(to_tsvector('english', COALESCE(g.title, '')), 'A'),
               setweight(to_tsvector('english', COALESCE(g.description, '')), 'B')
        INTO title_vec, desc_vec
        FROM "Gist" g
        WHERE g.id = target_gist_id;

        UPDATE "Gist"
        SET "searchVector" = title_vec || desc_vec || files_vec
        WHERE id = target_gist_id;

        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await this.$executeRawUnsafe(`DROP TRIGGER IF EXISTS gist_search_vector_trigger ON "Gist"`);
    await this.$executeRawUnsafe(`
      CREATE TRIGGER gist_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "Gist"
      FOR EACH ROW EXECUTE FUNCTION gist_search_vector_gist_update()
    `);

    await this.$executeRawUnsafe(`DROP TRIGGER IF EXISTS gistfile_search_vector_trigger ON "GistFile"`);
    await this.$executeRawUnsafe(`
      CREATE TRIGGER gistfile_search_vector_trigger
      AFTER INSERT OR UPDATE OR DELETE ON "GistFile"
      FOR EACH ROW EXECUTE FUNCTION gist_search_vector_file_update()
    `);

    await this.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Gist_searchVector_idx" ON "Gist" USING GIN ("searchVector")`);

    await this.$executeRawUnsafe(`
      UPDATE "Gist" SET "searchVector" =
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        COALESCE((
          SELECT setweight(to_tsvector('english', string_agg(gf.filename, ' ')), 'C') ||
                 setweight(to_tsvector('english', string_agg(gf.content, ' ')), 'D')
          FROM "GistFile" gf
          WHERE gf."gistId" = "Gist".id AND gf."revisionId" IS NULL
        ), ''::tsvector)
      WHERE "searchVector" IS NULL
    `);
  }
}
