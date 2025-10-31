-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Update existing users to have 'user' role
UPDATE users SET role = 'user' WHERE role IS NULL;

