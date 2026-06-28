import { FormEvent, KeyboardEvent, useState } from "react";
import { SendHorizontal } from "lucide-react";

type ChatComposerProps = {
  isLoading: boolean;
  onSubmit: (value: string) => Promise<void>;
};

export default function ChatComposer({ isLoading, onSubmit }: ChatComposerProps) {
  const [value, setValue] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextValue = value.trim();
    if (!nextValue || isLoading) {
      return;
    }

    setValue("");
    await onSubmit(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
    }
  };

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="chat-input">
        输入你的问题
      </label>

      <textarea
        id="chat-input"
        className="composer-input"
        rows={3}
        value={value}
        placeholder="例如：帮我概括一下大模型函数调用的基本流程"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />

      <div className="composer-footer">
        <span className="composer-hint">Enter 发送，Shift + Enter 换行</span>
        <button className="composer-button" type="submit" disabled={isLoading || !value.trim()}>
          <SendHorizontal size={16} />
          <span>{isLoading ? "思考中" : "发送"}</span>
        </button>
      </div>
    </form>
  );
}
