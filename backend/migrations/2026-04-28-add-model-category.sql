-- 2026-04-28: add 'model' to clothing category enums
--
-- TypeORM `synchronize` is off in NODE_ENV=production, so this ALTER must be
-- run manually once on each environment that's already past the previous schema.
--
-- Run on production:
--   mysql -u $DB_USER -p $DB_NAME < backend/migrations/2026-04-28-add-model-category.sql
--
-- Idempotent — running twice is fine.

ALTER TABLE clothing_images
  MODIFY category ENUM('top','bottom','shoes','accessories','model') NOT NULL;

ALTER TABLE outfit_items
  MODIFY category ENUM('top','bottom','shoes','accessories','model') NOT NULL;
