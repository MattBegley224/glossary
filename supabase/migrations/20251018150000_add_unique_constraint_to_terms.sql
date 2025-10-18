/*
  # Add Unique Constraint to Terms

  1. Changes
    - Add unique constraint to `term_name` column in `terms` table
    - This prevents duplicate term names from being created

  2. Security
    - Ensures data integrity by preventing duplicate entries
    - Case-insensitive uniqueness using lower() function

  3. Notes
    - Existing duplicate terms (if any) will need to be resolved before applying this migration
    - The constraint uses a unique index with lower() to ensure case-insensitive uniqueness
*/

-- Create unique index on term_name (case-insensitive)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'terms_term_name_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX terms_term_name_unique_idx ON terms (lower(term_name));
  END IF;
END $$;
