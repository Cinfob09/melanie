/*
  # Create Activity Logs Table

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `action_type` (text: 'client_added', 'client_updated', 'client_deleted', 'appointment_added', 'appointment_updated', 'appointment_deleted', 'appointment_completed')
      - `entity_type` (text: 'client', 'appointment')
      - `entity_id` (uuid)
      - `entity_name` (text - name of the client or service)
      - `description` (text - human readable description)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `activity_logs` table
    - Users can only see their own activity logs
    - Admins can see all activity logs

  3. Indexes
    - Index on user_id for faster queries
    - Index on created_at for sorting
    - Composite index on user_id and created_at
*/

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('client_added', 'client_updated', 'client_deleted', 'appointment_added', 'appointment_updated', 'appointment_deleted', 'appointment_completed')),
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'appointment')),
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);
