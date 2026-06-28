import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import Home from "@/pages/Home";
import { useChatStore } from "@/hooks/useChatStore";

describe("Home", () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it("渲染欢迎文案、模型信息和输入区", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /把 Qwen 接进一个干净、可直接演示的聊天界面/i })).toBeInTheDocument();
    expect(screen.getByText("当前模型")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/例如：帮我概括一下大模型函数调用的基本流程/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /发送/i })).toBeInTheDocument();
  });
});
