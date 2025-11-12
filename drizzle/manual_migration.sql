-- Manual migration to handle enum changes and add new tables
-- This needs to be run before the automatic migration

-- First, update any existing data in review_queue to use lowercase
UPDATE review_queue SET status = LOWER(status::text)::text WHERE status IS NOT NULL;
UPDATE review_queue SET priority = LOWER(priority::text)::text WHERE priority IS NOT NULL;

-- Now we can proceed with the schema changes
-- The drizzle-kit push will handle the rest
