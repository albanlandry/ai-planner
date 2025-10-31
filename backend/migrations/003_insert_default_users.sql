-- Insert or update admin user
-- Password: password
-- If user exists, update role and name only (don't change ID to avoid FK constraint issues)
INSERT INTO users (id, email, name, password_hash, role) VALUES 
('11111111-1111-1111-1111-111111111111', 'admin@calendar.com', 'Admin User', '$2a$10$7qHr2LHeLXbWrAFoo4.EQ.Zf/rIIPtE.uky2PJvp.RZ8KdN2rHeOO', 'admin')
ON CONFLICT (email) DO UPDATE SET 
  role = 'admin',
  name = 'Admin User';

-- Insert or update normal user
-- Password: password
INSERT INTO users (id, email, name, password_hash, role) VALUES 
('22222222-2222-2222-2222-222222222222', 'user@calendar.com', 'Normal User', '$2a$10$7qHr2LHeLXbWrAFoo4.EQ.Zf/rIIPtE.uky2PJvp.RZ8KdN2rHeOO', 'user')
ON CONFLICT (email) DO UPDATE SET 
  role = 'user',
  name = 'Normal User';

-- Insert default calendars for admin user (use actual user ID from database)
INSERT INTO calendars (id, user_id, name, color, is_primary) 
SELECT 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
  u.id,
  'Personal', 
  '#3B82F6', 
  true
FROM users u
WHERE u.email = 'admin@calendar.com'
  AND NOT EXISTS (
    SELECT 1 FROM calendars WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  )
ON CONFLICT DO NOTHING;

INSERT INTO calendars (id, user_id, name, color, is_primary) 
SELECT 
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', 
  u.id,
  'Work', 
  '#EF4444', 
  false
FROM users u
WHERE u.email = 'admin@calendar.com'
  AND NOT EXISTS (
    SELECT 1 FROM calendars WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab'
  )
ON CONFLICT DO NOTHING;

-- Insert default calendars for normal user (use actual user ID from database)
INSERT INTO calendars (id, user_id, name, color, is_primary) 
SELECT 
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
  u.id,
  'Personal', 
  '#3B82F6', 
  true
FROM users u
WHERE u.email = 'user@calendar.com'
  AND NOT EXISTS (
    SELECT 1 FROM calendars WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  )
ON CONFLICT DO NOTHING;

INSERT INTO calendars (id, user_id, name, color, is_primary) 
SELECT 
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc', 
  u.id,
  'Hobbies', 
  '#10B981', 
  false
FROM users u
WHERE u.email = 'user@calendar.com'
  AND NOT EXISTS (
    SELECT 1 FROM calendars WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc'
  )
ON CONFLICT DO NOTHING;

