-- Manual migration to fix enum types
-- Run this before drizzle-kit push

BEGIN;

-- Step 1: Drop dependent tables
DROP TABLE IF EXISTS review_queue CASCADE;
DROP TABLE IF EXISTS manual_review_queue CASCADE;

-- Step 2: Drop old enum types
DROP TYPE IF EXISTS priority CASCADE;
DROP TYPE IF EXISTS review_status CASCADE;

-- Step 3: Create new enum types with lowercase values
CREATE TYPE priority AS ENUM('low', 'medium', 'high');
CREATE TYPE review_status AS ENUM('pending', 'in_review', 'completed');

-- Step 4: Create calculation_status enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE calculation_status AS ENUM('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 5: Create user_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM('pharmacist', 'admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMIT;

-- Now run: pnpm drizzle-kit push --force
