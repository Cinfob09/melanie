/*
  # Create services table

  1. New Tables
    - `services`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `services` table
    - Add policy for authenticated users to read all services
    - Add policy for authenticated users to insert services
    - Add policy for authenticated users to update services
    - Add policy for authenticated users to delete services

  3. Initial Data
    - Insert default services in French
*/

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policies for services
CREATE POLICY "Users can read all services"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete services"
  ON services
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert default services
INSERT INTO services (name) VALUES
  ('Consultation'),
  ('Réunion de suivi'),
  ('Révision de projet'),
  ('Session de stratégie'),
  ('Session de formation')
ON CONFLICT (name) DO NOTHING;
