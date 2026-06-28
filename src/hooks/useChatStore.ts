import { create } from "zustand";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatState = {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  model: string;
  sendMessage: (message: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
};

const initialAssistantMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "你好，我是一个极简 Qwen 问答机器人。直接输入你的问题，我会通过 DashScope 为你生成回答。",
};

const getInitialState = () => ({
  messages: [initialAssistantMessage],
  isLoading: false,
  error: null as string | null,
  model: "qwen-plus",
});

export const useChatStore = create<ChatState>((set) => ({
  ...getInitialState(),
  async sendMessage(message) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedMessage,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      const data = (await response.json()) as { reply?: string; model?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "模型暂时没有返回内容，请稍后重试。");
      }

      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.reply,
          },
        ],
        isLoading: false,
        error: null,
        model: data.model || state.model,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "请求失败，请稍后再试。",
      });
    }
  },
  clearError() {
    set({ error: null });
  },
  reset() {
    set(getInitialState());
  },
}));
