import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Star } from "lucide-react";
import { AIFeedbackModal } from "./AIFeedbackModal";

interface FeedbackButtonProps {
  conversationId?: string;
  escalationId?: string;
  messageId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  context?: string;
  className?: string;
}

export function FeedbackButton({
  conversationId,
  escalationId,
  messageId,
  variant = "outline",
  size = "sm",
  context,
  className = "",
}: FeedbackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        <Star className="h-4 w-4 mr-2" />
        Rate AI
      </Button>

      <AIFeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        conversationId={conversationId}
        escalationId={escalationId}
        messageId={messageId}
        initialContext={context}
      />
    </>
  );
}
