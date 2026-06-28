import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatStore } from "@/hooks/useChatStore";

describe("useChatStore", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("在请求成功后追加用户消息和模型回答", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          reply: "这是来自 Qwen 的回答。",
          model: "qwen-plus",
        }),
      }),
    );

    await useChatStore.getState().sendMessage("你好");

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(3);
    expect(state.messages[1].content).toBe("你好");
    expect(state.messages[2].content).toBe("这是来自 Qwen 的回答。");
    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("在请求失败时保留用户消息并写入错误信息", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "DashScope 密钥无效。",
        }),
      }),
    );

    await useChatStore.getState().sendMessage("测试失败");

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1].content).toBe("测试失败");
    expect(state.error).toBe("DashScope 密钥无效。");
    expect(state.isLoading).toBe(false);
  });
});
