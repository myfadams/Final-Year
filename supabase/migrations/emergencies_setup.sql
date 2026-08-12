-- ============================================================================
-- Emergencies Table Setup & Row Level Security (RLS) Policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.emergencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NULL,
  location_text text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  location_geom geography(Point, 4326) NULL,
  severity text NULL,
  is_resolved boolean NULL DEFAULT false,
  false_alarm boolean NULL DEFAULT false,
  creator_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  responders_count integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  resolved_at timestamp with time zone NULL,
  response_time_seconds integer NULL,
  voice_notes text[] NULL DEFAULT ARRAY[]::text[],
  visual_media text[] NULL DEFAULT ARRAY[]::text[],

  CONSTRAINT emergencies_pkey PRIMARY KEY (id)
);

-- Indexing for fast query performance
CREATE INDEX IF NOT EXISTS idx_emergencies_created_at ON public.emergencies (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergencies_creator_id ON public.emergencies (creator_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_is_resolved ON public.emergencies (is_resolved);

-- Enable Row Level Security (RLS)
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

-- 1. INSERT Policy: Authenticated users can insert their own emergency reports
CREATE POLICY "Authenticated users can create emergencies"
ON public.emergencies
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = creator_id
);

-- 2. SELECT Policy: Authenticated users can view emergency reports
CREATE POLICY "Authenticated users can view emergencies"
ON public.emergencies
FOR SELECT
TO authenticated
USING (true);

-- 3. UPDATE Policy: Users can update their own emergency reports or responders can update status
CREATE POLICY "Users can update their own emergencies"
ON public.emergencies
FOR UPDATE
TO authenticated
USING (
  auth.uid() = creator_id OR true
)
WITH CHECK (
  auth.uid() = creator_id OR true
);

-- ============================================================================
-- Supabase Storage Bucket Setup for Emergencies
-- ============================================================================
-- Bucket Name: emergencies
-- Folder: incidentDetailsMedia
-- Make sure the bucket 'emergencies' is created and set to public or authorized in Supabase Dashboard.
