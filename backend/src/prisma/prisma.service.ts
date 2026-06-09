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

      this.logger.log('Creating update_gist_search_vector function...');
      await this
        .$executeRawUnsafe(`CREATE OR REPLACE FUNCTION update_gist_search_vector(gist_id text)
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
$$ LANGUAGE plpgsql;`);
      this.logger.log('update_gist_search_vector function created');

      this.logger.log('Creating gist_search_vector_trigger function...');
      await this.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION gist_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
    PERFORM update_gist_search_vector(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`);
      this.logger.log('gist_search_vector_trigger function created');

      this.logger.log('Creating gist_file_search_vector_trigger function...');
      await this.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION gist_file_search_vector_trigger()
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
$$ LANGUAGE plpgsql;`);
      this.logger.log('gist_file_search_vector_trigger function created');

      this.logger.log('Creating GIN index...');
      await this.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS gist_search_vector_idx ON "Gist" USING GIN ("searchVector");`
      );
      this.logger.log('GIN index created');

      this.logger.log('Creating gist table trigger...');
      await this.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_gist_search_vector ON "Gist";`);
      await this.$executeRawUnsafe(`CREATE TRIGGER trg_gist_search_vector
AFTER INSERT OR UPDATE OF title, description ON "Gist"
FOR EACH ROW
EXECUTE FUNCTION gist_search_vector_trigger();`);
      this.logger.log('Gist table trigger created');

      this.logger.log('Creating gist_file table trigger...');
      await this.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS trg_gist_file_search_vector ON "GistFile";`
      );
      await this.$executeRawUnsafe(`CREATE TRIGGER trg_gist_file_search_vector
AFTER INSERT OR UPDATE OR DELETE ON "GistFile"
FOR EACH ROW
EXECUTE FUNCTION gist_file_search_vector_trigger();`);
      this.logger.log('GistFile table trigger created');

      this.logger.log('Counting gists with null search vector...');
      const countResult = await this.$queryRawUnsafe<any>(
        `SELECT COUNT(*)::int as count FROM "Gist"`
      );
      const totalCount = Array.isArray(countResult) ? countResult[0]?.count : 0;
      this.logger.log(`Total gists: ${totalCount}`);

      const nullCountResult = await this.$queryRawUnsafe<any>(
        `SELECT COUNT(*)::int as count FROM "Gist" WHERE "searchVector" IS NULL`
      );
      const nullCount = Array.isArray(nullCountResult) ? nullCountResult[0]?.count : 0;
      this.logger.log(`Gists with null search vector: ${nullCount}`);

      if (nullCount > 0) {
        this.logger.log('Backfilling search vectors...');

        const gistsToUpdate = await this.$queryRawUnsafe<any>(
          `SELECT id FROM "Gist" WHERE "searchVector" IS NULL LIMIT 1000`
        );

        if (Array.isArray(gistsToUpdate) && gistsToUpdate.length > 0) {
          this.logger.log(`Processing ${gistsToUpdate.length} gists...`);
          for (const gist of gistsToUpdate) {
            const escapedId = gist.id.replace(/'/g, "''");
            await this.$executeRawUnsafe(`SELECT update_gist_search_vector('${escapedId}'::text)`);
          }
          this.logger.log('Batch completed, checking remaining...');

          const remainingResult = await this.$queryRawUnsafe<any>(
            `SELECT COUNT(*)::int as count FROM "Gist" WHERE "searchVector" IS NULL`
          );
          const remaining = Array.isArray(remainingResult) ? remainingResult[0]?.count : 0;
          this.logger.log(`Remaining gists with null search vector: ${remaining}`);
        }

        this.logger.log('Search vectors backfilled');
      }

      const finalCheck = await this.$queryRawUnsafe<any>(
        `SELECT COUNT(*)::int as count FROM "Gist" WHERE "searchVector" IS NOT NULL`
      );
      const populatedCount = Array.isArray(finalCheck) ? finalCheck[0]?.count : 0;
      this.logger.log(
        `Search vector initialization completed. ${populatedCount} gists have search vectors.`
      );
    } catch (error) {
      this.logger.error('Failed to initialize search vector', error);
      if (error instanceof Error) {
        this.logger.error('Error message:', error.message);
        this.logger.error('Error stack:', error.stack);
      }
    }
  }
}
