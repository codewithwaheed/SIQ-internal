-- Add foreign key constraint between user_roles and auth.users
ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_user
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify profiles.user_id also has FK to auth.users (should already exist)
-- This ensures both tables properly reference auth.users