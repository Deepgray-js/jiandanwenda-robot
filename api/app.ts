import cors from "cors";
import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app: express.Application = express();
const DEFAULT_MODEL = process.env.QWEN_MODEL || "qwen-plus";
const DASHSCOPE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distCandidates = [
  path.resolve(__dirname, "..", "dist"),
  path.resolve(__dirname, "..", "..", "dist"),
];
const distDir = distCandidates.find((candidate) => existsSync(path.join(candidate, "index.html"))) || distCandidates[0];
const indexHtmlPath = path.join(distDir, "index.html");

type DashScopeResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

function extractReply(payload: DashScopeResponse) {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }

  return "";
}

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "ok",
    model: DEFAULT_MODEL,
  });
});

app.post("/api/chat", async (req: Request, res: Response, next: NextFunction) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    res.status(400).json({ error: "问题不能为空。" });
    return;
  }

  if (!process.env.DASHSCOPE_API_KEY) {
    res.status(500).json({ error: "服务端缺少 DASHSCOPE_API_KEY，请先完成环境变量配置。" });
    return;
  }

  try {
    const response = await fetch(DASHSCOPE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "你是一个回答简洁、直接、清晰的问答助手。",
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
      }),
    });

    const payload = (await response.json()) as DashScopeResponse & { error?: { message?: string } };

    if (!response.ok) {
      const messageFromApi = payload.error?.message || "DashScope 调用失败，请检查模型名或密钥。";
      res.status(response.status).json({ error: messageFromApi });
      return;
    }

    const reply = extractReply(payload);

    if (!reply) {
      res.status(502).json({ error: "模型没有返回有效内容，请稍后再试。" });
      return;
    }

    res.status(200).json({
      reply,
      model: DEFAULT_MODEL,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    error: error.message || "服务端内部错误。",
  });
});

if (existsSync(indexHtmlPath)) {
  app.use(express.static(distDir));

  // 生产环境下让 Express 可以直接托管 Vite 构建产物，避免必须额外起静态文件服务。
  app.get(/^(?!\/api(?:\/|$)).*/, (_req: Request, res: Response) => {
    res.sendFile(indexHtmlPath);
  });
}

app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({
    error: "API 路径不存在。",
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: existsSync(indexHtmlPath)
      ? "页面不存在。"
      : "前端构建产物不存在，请先执行 npm run build。",
  });
});

export default app;
