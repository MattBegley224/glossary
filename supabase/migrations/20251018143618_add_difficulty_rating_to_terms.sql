/*
  # Add Difficulty Rating to Terms

  1. Changes
    - Add `difficulty` column to `terms` table (integer 0-3, default 0)
    - 0 = not rated, 1-3 = difficulty level (1 = easy, 3 = hard)
    - Remove the `is_favorite` column as it's being replaced by difficulty rating
  
  2. Notes
    - Existing terms will have difficulty = 0 (not rated)
    - Difficulty is nullable but defaults to 0
*/

-- Add difficulty column to terms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'terms' AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE terms ADD COLUMN difficulty integer DEFAULT 0;
  END IF;
END $$;

-- Add constraint to ensure difficulty is between 0 and 3
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'terms_difficulty_check'
  ) THEN
    ALTER TABLE terms ADD CONSTRAINT terms_difficulty_check CHECK (difficulty >= 0 AND difficulty <= 3);
  END IF;
END $$;