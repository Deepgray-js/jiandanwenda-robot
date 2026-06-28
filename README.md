# 极简问答机器人

一个基于 `React + Vite + Express + DashScope Qwen` 的极简网页问答机器人。

## 功能概览

- 极简聊天界面，适合演示和快速接入
- 后端代理 DashScope API，避免前端暴露密钥
- 支持本地开发模式与 Linux 生产部署
- 支持前后端分别构建，其中后端会在生产环境自动托管 `dist/`

## 环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

填写：

```env
DASHSCOPE_API_KEY=你的真实密钥
QWEN_MODEL=qwen-plus
PORT=3001
```

## 本地开发

安装依赖：

```bash
npm install
```

启动前后端开发服务：

```bash
npm run dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3001`

## 检查与测试

```bash
npm run check
npm run test
```

## 生产构建

构建前端与后端：

```bash
npm run build
```

构建完成后会生成：

- `dist/`：前端静态资源
- `server-dist/`：后端运行产物

## 生产启动

```bash
npm start
```

推荐在 Linux 上配合 `NODE_ENV=production` 使用：

```bash
NODE_ENV=production npm start
```

## Linux 部署

项目已经补齐 Linux 生产部署所需内容：

- `npm start`：标准生产启动脚本
- `tsconfig.server.json`：后端编译配置
- `deploy/linux/jiandanwenda.service`：systemd 示例
- `deploy/linux/jiandanwenda.nginx.conf`：Nginx 示例
- `docs/linux-production-deploy.md`：完整部署说明
- `docs/github-actions-cicd.md`：GitHub Actions 极简自动部署说明（`ssh-action + git pull`）

如需部署到 Linux，请优先阅读：

- [Linux 生产部署说明](./docs/linux-production-deploy.md)
- [GitHub Actions 自动部署](./docs/github-actions-cicd.md)
