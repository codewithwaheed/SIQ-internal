import { AiChatInterface } from "@/components/chat/AiChatInterface";
import { useAuth } from "@/contexts/AuthContext";

export const BusinessOwnerDashboard = () => {
  const { user, profile } = useAuth();

  return <AiChatInterface />;
};
