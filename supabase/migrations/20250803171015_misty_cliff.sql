/*
  # Create services table with proper RLS policies

  1. New Tables
    - `services`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `services` table
    - Add policies for anonymous users to perform CRUD operations
    - This allows the app to work without requiring Supabase authentication

  3. Initial Data
    - Insert default services in French
*/

-- Create the services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous users (for demo purposes)
-- In production, you would typically require authentication

-- Allow anonymous users to read all services
CREATE POLICY "Allow anonymous users to read services"
  ON services
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to insert services
CREATE POLICY "Allow anonymous users to insert services"
  ON services
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update services
CREATE POLICY "Allow anonymous users to update services"
  ON services
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to delete services
CREATE POLICY "Allow anonymous users to delete services"
  ON services
  FOR DELETE
  TO anon
  USING (true);

-- Insert default services in French
INSERT INTO services (name) VALUES
  ('Consultation'),
  ('Réunion de suivi'),
  ('Révision de projet'),
  ('Session de stratégie'),
  ('Session de formation')
ON CONFLICT (name) DO NOTHING;