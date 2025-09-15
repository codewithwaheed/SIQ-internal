-- Remove org_id constraint from chat_conversations RLS policies
-- This allows conversation creation without requiring org_id

-- Drop existing org-based policies
DROP POLICY IF EXISTS "Users can create conversations in their org" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can view conversations in their org" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can update conversations in their org" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can delete conversations in their org" ON public.chat_conversations;

-- Temporarily disable RLS for easier development
ALTER TABLE public.chat_conversations DISABLE ROW LEVEL SECURITY;

-- Optional: Create new user-based policies (commented out while RLS is disabled)
-- CREATE POLICY "Users can create conversations" ON public.chat_conversations 
-- FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- CREATE POLICY "Users can view their conversations" ON public.chat_conversations 
-- FOR SELECT USING (user_id = auth.uid());

-- CREATE POLICY "Users can update their conversations" ON public.chat_conversations 
-- FOR UPDATE USING (user_id = auth.uid());

-- CREATE POLICY "Users can delete their conversations" ON public.chat_conversations 
-- FOR DELETE USING (user_id = auth.uid());
