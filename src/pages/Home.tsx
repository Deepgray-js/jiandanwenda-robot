import { Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import ChatComposer from "@/components/ChatComposer";
import MessageBubble from "@/components/MessageBubble";
import { useChatStore } from "@/hooks/useChatStore";

export default function Home() {
  const { messages, isLoading, error, model, sendMessage, clearError } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const totalMessages = useMemo(
    () => messages.filter((message) => message.role !== "assistant" || message.id !== "welcome").length,
    [messages],
  );

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-kicker">
            <Sparkles size={14} />
            极简问答机器人
          </span>
          <h1>把 Qwen 接进一个干净、可直接演示的聊天界面。</h1>
          <p>
            前端负责对话体验，服务端负责保护 DashScope 密钥。你只需要配置环境变量，就可以开始提问。
          </p>
        </div>

        <div className="hero-meta">
          <div>
            <span>当前模型</span>
            <strong>{model}</strong>
          </div>
          <div>
            <span>当前会话</span>
            <strong>{totalMessages} 条消息</strong>
          </div>
        </div>
      </section>

      <section className="chat-panel" aria-label="对话区域">
        <header className="chat-panel-header">
          <div>
            <h2>对话流</h2>
            <p>保持界面极简，只保留问答所需的核心信息。</p>
          </div>
        </header>

        <div className="chat-scroll-area">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading ? (
            <div className="typing-indicator" aria-live="polite">
              <span />
              <span />
              <span />
              <em>Qwen 正在思考...</em>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {error ? (
          <div className="error-banner" role="alert">
            <TriangleAlert size={16} />
            <span>{error}</span>
            <button type="button" onClick={clearError}>
              知道了
            </button>
          </div>
        ) : null}

        <ChatComposer isLoading={isLoading} onSubmit={sendMessage} />
      </section>
    </main>
  );
}
