import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings `discoveries_category_check` in line with the capitalised
 * `DiscoveryCategory` enum (api/src/discoveries/discovery-category.ts).
 *
 * The constraint was originally written with lower-case identifiers and was
 * later edited in place inside InitialSchema1787734644000. TypeORM keys the
 * `migrations` table on the migration's class name, which that edit did not
 * change, so any database that had already run InitialSchema kept the old
 * lower-case constraint — and every insert carrying a category would fail
 * against it, because CreateDiscoveryDto only ever admits 'Landscape',
 * 'Monument' and friends.
 *
 * This migration repairs those databases. It is deliberately written to be a
 * no-op on a database where InitialSchema ran with the already-corrected SQL,
 * so it is safe whichever state an environment happens to be in:
 *
 *   - DROP ... IF EXISTS tolerates the constraint being absent.
 *   - The UPDATE only rewrites rows that are not already capitalised.
 *   - Re-adding the constraint reproduces exactly what the corrected
 *     InitialSchema creates.
 */
export class RepairDiscoveryCategoryCheck1787734646000 implements MigrationInterface {
  name = 'RepairDiscoveryCategoryCheck1787734646000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Dropped before the data fix: the rows below are invalid under whichever
    // of the two spellings is currently installed, so the constraint has to be
    // out of the way for the UPDATE to land.
    await queryRunner.query(`
      ALTER TABLE discoveries
          DROP CONSTRAINT IF EXISTS discoveries_category_check
    `);

    // Every category is a single word, so INITCAP is exactly the mapping from
    // the old spelling to the new one ('landscape' -> 'Landscape'). Rows that
    // are already capitalised are left untouched by the WHERE clause.
    await queryRunner.query(`
      UPDATE discoveries
         SET category = INITCAP(category)
       WHERE category IS NOT NULL
         AND category <> INITCAP(category)
    `);

    await queryRunner.query(`
      ALTER TABLE discoveries
          ADD CONSTRAINT discoveries_category_check
          CHECK (
              category IS NULL
              OR category IN (
                  'Landscape',
                  'Monument',
                  'Food',
                  'Animal',
                  'Plant',
                  'Culture',
                  'Other'
              )
          )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE discoveries
          DROP CONSTRAINT IF EXISTS discoveries_category_check
    `);

    // The data has to go back with the constraint, or re-adding the lower-case
    // check would fail against the capitalised rows this migration wrote.
    await queryRunner.query(`
      UPDATE discoveries
         SET category = LOWER(category)
       WHERE category IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE discoveries
          ADD CONSTRAINT discoveries_category_check
          CHECK (
              category IS NULL
              OR category IN (
                  'landscape',
                  'monument',
                  'food',
                  'animal',
                  'plant',
                  'culture',
                  'other'
              )
          )
    `);
  }
}
