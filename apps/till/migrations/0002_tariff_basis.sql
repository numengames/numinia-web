-- Why each tariff version was published (MIS-184): the Oracle desk.
--
-- The desk (src/worker.ts, `OracleDesk`) schedules a new version with who
-- published it (`created_by`, the Oracle's wallet) and why: a JSON object
-- with a human note and, optionally, the price calculator's assumptions at
-- that moment. The till stores it as given and never reads it to charge.
-- NULL for the seed and for any version published without one. Always a
-- JSON object, at most 16 KB (16384 characters of JSON text; the desk itself
-- refuses more than 16384 bytes of UTF-8, which is never fewer characters).
--
-- 0001 is applied to the live database and is never edited: a change to the
-- schema is a new numbered file. The table stays append-only — its UPDATE,
-- DELETE and REPLACE triggers (0001) are untouched, and adding a column
-- changes no row: the existing ones read NULL, which the CHECK accepts.
ALTER TABLE tariff_versions ADD COLUMN basis TEXT CHECK
  (basis IS NULL OR (json_valid(basis) AND json_type(basis) = 'object' AND length(basis) <= 16384));
