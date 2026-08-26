import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings `discoveries_category_check` in line with the capitalised
 * `DiscoveryCategory` enum (api/src/discoveries/discovery-category.ts).
 *
 * The values were capitalised in the original `infra/postgres/init/` DDL, went
 * lower-case when that DDL was converted into InitialSchema1787734644000
 * (d091b5b), and were put back in #99 — an in-place edit of a migration that
 * had by then run on developer machines. TypeORM keys the `migrations` table
 * on class name, which the edit did not change, so those databases keep the
 * lower-case constraint and will reject every insert CreateDiscoveryDto
 * admits, with no pending migration to tell them why.
 *
 * Production is not affected: its volume predates the conversion, so its
 * constraint came from the DDL and was capitalised all along. This is a repair
 * for the databases caught in that window, not a production fix.
 *
 * It is written to be a no-op wherever the constraint is already correct, so
 * it is safe whichever of the two spellings an environment happens to hold:
 *
 *   - DROP ... IF EXISTS tolerates the constraint being absent.
 *   - The UPDATE only rewrites rows that are not already capitalised.
 *   - Re-adding the constraint reproduces exactly what InitialSchema creates.
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
