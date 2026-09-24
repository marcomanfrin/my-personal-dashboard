-- Give existing cards a position that keeps the order shown until now
-- (most recently updated first), with Trello-like gaps of 65536.
UPDATE "tasks" AS t
SET "position" = ranked.rn * 65536
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "column" ORDER BY "updated_at" DESC) AS rn
  FROM "tasks"
  WHERE "position" IS NULL
) AS ranked
WHERE t."id" = ranked."id";
