-- Reset enums script - Run this if you get enum value errors
-- WARNING: This will drop and recreate enum-dependent tables

-- Drop dependent tables first
DROP TABLE IF EXISTS review_queue CASCADE;
DROP TABLE IF EXISTS manual_review_queue CASCADE;

-- Now drop and recreate the enums
DROP TYPE IF EXISTS priority CASCADE;
DROP TYPE IF EXISTS review_status CASCADE;

CREATE TYPE priority AS ENUM('low', 'medium', 'high');
CREATE TYPE review_status AS ENUM('pending', 'in_review', 'completed');

-- The drizzle-kit push will recreate the tables
