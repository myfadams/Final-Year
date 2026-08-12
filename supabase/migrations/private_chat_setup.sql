-- ============================================================================
-- Private Chat & Messages Setup with Row Level Security (RLS) & Realtime
-- ============================================================================

-- 1. Ensure private_chat table exists
CREATE TABLE IF NOT EXISTS public.private_chat (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  user_id_1 uuid NOT NULL,
  user_id_2 uuid NOT NULL,
  contact_name text NULL,
  contact_relationship text NULL,
  contact_avatar_url text NULL,
  safewalk_active boolean NOT NULL DEFAULT false,
  safewalk_started_at timestamp with time zone NULL,
  safewalk_ended_at timestamp with time zone NULL,
  safewalk_start_lat double precision NULL,
  safewalk_start_lng double precision NULL,
  safewalk_destination text NULL,
  location_share_active boolean NOT NULL DEFAULT false,
  location_share_user_id uuid NULL,
  location_share_lat double precision NULL,
  location_share_lng double precision NULL,
  location_share_label text NULL,
  location_share_updated_at timestamp with time zone NULL,
  im_okay_last_sent_by uuid NULL,
  im_okay_sent_at timestamp with time zone NULL,
  im_okay_expires_at timestamp with time zone NULL,
  last_message_at timestamp with time zone NULL,
  last_message_preview text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT private_chat_pkey PRIMARY KEY (id),
  CONSTRAINT unique_chat_pair UNIQUE (user_id_1, user_id_2),
  CONSTRAINT private_chat_user_id_1_fkey FOREIGN KEY (user_id_1) REFERENCES auth.users (id),
  CONSTRAINT private_chat_user_id_2_fkey FOREIGN KEY (user_id_2) REFERENCES auth.users (id),
  CONSTRAINT no_self_chat CHECK ((user_id_1 <> user_id_2))
);

-- 2. Ensure private_chat_messages table exists
CREATE TABLE IF NOT EXISTS public.private_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  chat_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_name text NULL,
  sender_role text NULL,
  sender_avatar_url text NULL,
  type text NOT NULL DEFAULT 'text',
  text_content text NULL,
  audio_url text NULL,
  audio_duration_sec integer NULL,
  media_url text NULL,
  media_type text NULL,
  location_lat double precision NULL,
  location_lng double precision NULL,
  location_label text NULL,
  location_timestamp_text text NULL,
  walk_safe_session_id uuid NULL,
  im_okay_note text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT private_chat_messages_pkey PRIMARY KEY (id),

  CONSTRAINT private_chat_messages_chat_id_fkey
    FOREIGN KEY (chat_id)
    REFERENCES private_chat (id)
    ON DELETE CASCADE,

  CONSTRAINT private_chat_messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES auth.users (id),

  CONSTRAINT private_chat_messages_media_type_check
    CHECK (
      media_type = ANY (ARRAY['image', 'video'])
    ),

  CONSTRAINT private_chat_messages_type_check
    CHECK (
      type = ANY (
        ARRAY[
          'text',
          'audio',
          'media',
          'location_share',
          'walk_safe',
          'im_okay'
        ]
      )
    )
);

-- 3. Indexes for speed and fast pagination
CREATE INDEX IF NOT EXISTS idx_private_chat_users ON public.private_chat (user_id_1, user_id_2);
CREATE INDEX IF NOT EXISTS idx_private_chat_messages_chat_created ON public.private_chat_messages (chat_id, created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.private_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for private_chat
DROP POLICY IF EXISTS "Users can view their own private chats" ON public.private_chat;
CREATE POLICY "Users can view their own private chats"
  ON public.private_chat
  FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "Users can create private chats with others" ON public.private_chat;
CREATE POLICY "Users can create private chats with others"
  ON public.private_chat
  FOR INSERT
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "Users can update their own private chats" ON public.private_chat;
CREATE POLICY "Users can update their own private chats"
  ON public.private_chat
  FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- 6. RLS Policies for private_chat_messages
DROP POLICY IF EXISTS "Users can view messages in their private chats" ON public.private_chat_messages;
CREATE POLICY "Users can view messages in their private chats"
  ON public.private_chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.private_chat pc
      WHERE pc.id = private_chat_messages.chat_id
        AND (pc.user_id_1 = auth.uid() OR pc.user_id_2 = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert messages into their private chats" ON public.private_chat_messages;
CREATE POLICY "Users can insert messages into their private chats"
  ON public.private_chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.private_chat pc
      WHERE pc.id = private_chat_messages.chat_id
        AND (pc.user_id_1 = auth.uid() OR pc.user_id_2 = auth.uid())
    )
  );

-- 7. Add tables to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'private_chat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chat;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'private_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chat_messages;
  END IF;
END $$;
