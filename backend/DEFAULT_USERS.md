# Default Users

This document describes the default users created by the database migrations.

## Default Users

### Admin User
- **Email**: `admin@calendar.com`
- **Password**: `password`
- **Name**: Admin User
- **Role**: `admin`
- **ID**: `11111111-1111-1111-1111-111111111111`

### Normal User
- **Email**: `user@calendar.com`
- **Password**: `password`
- **Name**: Normal User
- **Role**: `user`
- **ID**: `22222222-2222-2222-2222-222222222222`

## Default Calendars

### Admin User Calendars
1. **Personal** (Primary)
   - Color: `#3B82F6` (Blue)
   - ID: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`

2. **Work**
   - Color: `#EF4444` (Red)
   - ID: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab`

### Normal User Calendars
1. **Personal** (Primary)
   - Color: `#3B82F6` (Blue)
   - ID: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`

2. **Hobbies**
   - Color: `#10B981` (Green)
   - ID: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbc`

## Security Note

⚠️ **Important**: These default users are for development purposes only. **Always change the default passwords in production environments!**

The password hash is generated using bcrypt with 10 rounds. Both users use the password: `password`

## Usage

To use these default users:

1. Start the backend server (migrations will run automatically)
2. Login with either:
   - Admin: `admin@calendar.com` / `password`
   - Normal User: `user@calendar.com` / `password`

## Migration Files

The default users are created by the following migration files:
- `002_add_role_to_users.sql` - Adds role column to users table
- `003_insert_default_users.sql` - Inserts default users and calendars

