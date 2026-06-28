# Linux 生产部署说明

本文档用于将当前项目部署到 Linux 服务器，不使用 Docker。

## 1. 部署目标

- 前端通过 `vite build` 构建到 `dist/`
- 后端通过 `tsc -p tsconfig.server.json` 构建到 `server-dist/`
- Node 进程通过 `npm start` 启动
- 推荐使用 `systemd` 守护后端服务
- 推荐使用 `Nginx` 托管前端静态资源并反向代理 `/api`

## 2. 服务器要求

- 操作系统：Ubuntu 22.04 / 24.04 或其他兼容 Linux 发行版
- Node.js：20 LTS 或 22 LTS
- 软件：`git`、`nginx`

安装示例：

```bash
sudo apt update
sudo apt install -y git curl nginx build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

检查版本：

```bash
node -v
npm -v
```

## 3. 拉取项目

```bash
cd /opt
sudo git clone <你的仓库地址> jiandanwenda_robot
sudo chown -R $USER:$USER /opt/jiandanwenda_robot
cd /opt/jiandanwenda_robot
```

## 4. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
DASHSCOPE_API_KEY=你的真实密钥
QWEN_MODEL=qwen-plus
PORT=3001
```

说明：

- `DASHSCOPE_API_KEY`：DashScope 访问密钥
- `QWEN_MODEL`：默认模型名
- `PORT`：后端监听端口

## 5. 安装依赖与构建

如果仓库里已经有 `package-lock.json`，优先使用：

```bash
npm ci
```

否则使用：

```bash
npm install
```

运行检查与构建：

```bash
npm run check
npm run test
npm run build
```

构建完成后将生成：

- `dist/`：前端静态资源
- `server-dist/`：后端 Node 运行产物

## 6. 本机验证

先在服务器上直接启动一次：

```bash
NODE_ENV=production npm start
```

验证接口：

```bash
curl http://127.0.0.1:3001/api/health
```

如果你不打算使用 Nginx，也可以直接通过 Node 进程访问应用。当前服务端在检测到 `dist/index.html` 存在时，会自动托管前端静态资源。

## 7. 使用 systemd 守护后端

项目已提供示例文件：`deploy/linux/jiandanwenda.service`

复制到系统目录：

```bash
sudo cp deploy/linux/jiandanwenda.service /etc/systemd/system/jiandanwenda.service
```

按你的真实路径修改以下字段：

- `WorkingDirectory`
- `ExecStart`
- `User`
- `Group`

然后启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable jiandanwenda
sudo systemctl start jiandanwenda
sudo systemctl status jiandanwenda
```

查看日志：

```bash
journalctl -u jiandanwenda -f
```

## 8. 使用 Nginx 托管前端并代理后端

项目已提供示例文件：`deploy/linux/jiandanwenda.nginx.conf`

复制并启用：

```bash
sudo cp deploy/linux/jiandanwenda.nginx.conf /etc/nginx/sites-available/jiandanwenda
sudo ln -s /etc/nginx/sites-available/jiandanwenda /etc/nginx/sites-enabled/jiandanwenda
```

按实际情况修改：

- `server_name`
- `root`

检测并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

此时访问：

- `/`：由 Nginx 直接返回前端页面
- `/api/*`：由 Nginx 反向代理到 `127.0.0.1:3001`

## 9. 更新部署流程

当你更新代码后，可以按下面顺序执行：

```bash
cd /opt/jiandanwenda_robot
git pull
npm ci
npm run build
sudo systemctl restart jiandanwenda
sudo systemctl status jiandanwenda
```

如果前端页面没有立即更新，可以额外重载 Nginx：

```bash
sudo systemctl reload nginx
```

## 10. 故障排查

后端服务状态：

```bash
sudo systemctl status jiandanwenda
journalctl -u jiandanwenda -n 100 --no-pager
```

Nginx 状态与日志：

```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

接口联通检查：

```bash
curl http://127.0.0.1:3001/api/health
curl -X POST http://127.0.0.1:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好"}'
```

常见问题：

- `500` 且提示缺少 `DASHSCOPE_API_KEY`：说明 `.env` 未配置或 systemd 没读取到环境变量
- 页面能打开但问答失败：优先检查后端日志和 DashScope 密钥
- `server-dist` 不存在：说明没有执行 `npm run build`
- Nginx 启动失败：优先检查 `root` 路径和配置文件语法
