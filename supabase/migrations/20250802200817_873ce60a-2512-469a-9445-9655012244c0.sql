-- Create message_ratings table for feedback
CREATE TABLE public.message_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating_type TEXT NOT NULL CHECK (rating_type IN ('positive', 'negative')),
  feedback_text TEXT,
  subscription_tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.message_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for message ratings
CREATE POLICY "Users can view their own ratings" 
ON public.message_ratings 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own ratings" 
ON public.message_ratings 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own ratings" 
ON public.message_ratings 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all ratings" 
ON public.message_ratings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_message_ratings_updated_at
BEFORE UPDATE ON public.message_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_message_ratings_conversation_id ON public.message_ratings(conversation_id);
CREATE INDEX idx_message_ratings_user_id ON public.message_ratings(user_id);
CREATE INDEX idx_message_ratings_message_id ON public.message_ratings(message_id);
CREATE INDEX idx_message_ratings_rating_type ON public.message_ratings(rating_type);
CREATE INDEX idx_message_ratings_created_at ON public.message_ratings(created_at);