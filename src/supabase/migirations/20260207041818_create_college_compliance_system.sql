

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'staff', 'admin')),
  student_id text,
  department text,
  created_at timestamptz DEFAULT now()
);

-- Create violations table
CREATE TABLE IF NOT EXISTS violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  student_name text NOT NULL,
  department text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  due_date date NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'correcting', 'corrected', 'verified')),
  evidence_url text,
  correction_url text,
  reported_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  corrected_at timestamptz,
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id),
  rejection_reason text
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Anyone can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Violations policies for students
CREATE POLICY "Students can view own violations"
  ON violations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'student'
      AND users.student_id = violations.student_id
    )
  );

CREATE POLICY "Students can update own violations"
  ON violations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'student'
      AND users.student_id = violations.student_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'student'
      AND users.student_id = violations.student_id
    )
  );

-- Violations policies for staff
CREATE POLICY "Staff can view all violations"
  ON violations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'staff'
    )
  );

CREATE POLICY "Staff can create violations"
  ON violations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'staff'
    )
  );

CREATE POLICY "Staff can update violations they reported"
  ON violations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'staff'
    ) AND reported_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'staff'
    ) AND reported_by = auth.uid()
  );

-- Violations policies for admin
CREATE POLICY "Admin can view all violations"
  ON violations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admin can update all violations"
  ON violations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('correction-photos', 'correction-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for evidence photos
CREATE POLICY "Staff can upload evidence photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'evidence-photos' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'staff'
    )
  );

CREATE POLICY "Anyone authenticated can view evidence photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'evidence-photos');

-- Storage policies for correction photos
CREATE POLICY "Students can upload correction photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'correction-photos' AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'student'
    )
  );

CREATE POLICY "Anyone authenticated can view correction photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'correction-photos');
