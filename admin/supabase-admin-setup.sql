-- Step 1: Add role column to existing profiles table
-- (adjust table name if yours is different — check existing schema)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student'
  CHECK (role IN ('student', 'admin'));

-- Step 2: Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('hackathon', 'cultural', 'technical', 'sports', 'placement', 'other')),
  date DATE NOT NULL,
  time TIME,
  venue TEXT,
  registration_link TEXT,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: RLS Policies

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Events: students can read, only admins can write
CREATE POLICY "Anyone logged in can view events"
  ON events FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Only admins can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.email = auth.jwt() ->> 'email'
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.email = auth.jwt() ->> 'email'
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.email = auth.jwt() ->> 'email'
      AND profiles.role = 'admin'
    )
  );

-- Announcements: same pattern
CREATE POLICY "Anyone logged in can view announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Only admins can insert announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.email = auth.jwt() ->> 'email'
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.email = auth.jwt() ->> 'email'
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.email = auth.jwt() ->> 'email'
      AND profiles.role = 'admin'
    )
  );

-- Step 5: Set YOUR account as admin (replace with your actual email)
-- Run this after signing up with your VVCE admin email
UPDATE profiles
  SET role = 'admin'
  WHERE email = 'vvce25cse0197@vvce.ac.in';
