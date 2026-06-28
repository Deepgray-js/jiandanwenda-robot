import { Bot, UserRound } from "lucide-react";
import type { ChatMessage } from "@/hooks/useChatStore";

type MessageBubbleProps = {
  message: ChatMessage;
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={`message-row ${isAssistant ? "message-row-assistant" : "message-row-user"}`}
    >
      <div className={`message-avatar ${isAssistant ? "message-avatar-assistant" : "message-avatar-user"}`}>
        {isAssistant ? <Bot size={16} /> : <UserRound size={16} />}
      </div>

      <div className={`message-bubble ${isAssistant ? "message-bubble-assistant" : "message-bubble-user"}`}>
        <span className="message-role">{isAssistant ? "Qwen" : "你"}</span>
        <p>{message.content}</p>
      </div>
    </article>
  );
}
