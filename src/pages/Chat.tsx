import { ChatTestingInterface } from '@/components/chat/ChatTestingInterface';
import { useAuth } from '@/contexts/AuthContext';

const Chat = () => {
  const { user } = useAuth();

  // Show enhanced testing interface for admins, regular chat for others
  const isAdmin = user?.email?.includes('admin') || false; // Simplified admin check for demo

  return (
    <div className="container mx-auto flex h-screen flex-col p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          {isAdmin ? 'Chat Testing & API Simulation' : 'Chat'}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? 'Test the complete chat conversation flow including AI responses, consultant simulation, and status management'
            : 'Start a conversation with our AI assistant or escalate to a human expert'}
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <ChatTestingInterface className="h-full" />
      </div>
    </div>
  );
};

export default Chat;
