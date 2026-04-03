
-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  notify_viewed boolean NOT NULL DEFAULT true,
  notify_accepted boolean NOT NULL DEFAULT true,
  notify_rejected boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.notification_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Enable realtime on proposals
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;
