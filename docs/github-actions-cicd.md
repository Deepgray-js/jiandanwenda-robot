# GitHub Actions 极简自动部署

当前项目已切换为极简部署方案：

1. 本机提交代码并 `git push origin main`
2. GitHub Actions 使用 `appleboy/ssh-action`
3. 远程登录阿里云服务器
4. 在服务器执行 `git pull + npm ci + npm run build + systemctl restart`

这个方案的目标是简单、直接、容易排错。

## 一、当前工作流做了什么

工作流文件是 [deploy.yml](../.github/workflows/deploy.yml)。

当你推送到 `main` 分支时，它会在服务器执行这组命令：

```bash
cd ${SERVER_APP_DIR}
git fetch origin main
git checkout main
git pull --ff-only origin main
```

如果配置了 `SERVER_ENV_FILE`，还会自动覆盖服务器上的 `.env`：

```bash
printf '%s\n' "$SERVER_ENV_FILE" > .env
chmod 600 .env
```

然后继续执行：

```bash
npm ci
npm run build
systemctl restart ${SERVER_SYSTEMD_SERVICE}
systemctl status ${SERVER_SYSTEMD_SERVICE} --no-pager
```

## 二、你需要准备什么

服务器上必须提前具备：

- Node.js 22
- npm
- git
- 已经 clone 好项目代码
- 已经配置好 `systemd`
- 服务器上的仓库本身可以执行 `git pull`

## 三、服务器首次准备

### 1. 安装 Node.js 和基础软件

```bash
apt update
apt install -y git curl nginx build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

### 2. 拉取项目到服务器

如果你的实际目录是 `/root/jiandanwenda-robot`，就执行：

```bash
cd /root
git clone <你的仓库地址> jiandanwenda-robot
cd /root/jiandanwenda-robot
```

### 3. 手动准备 `.env`

```bash
cd /root/jiandanwenda-robot
cp .env.example .env
```

填入：

```env
DASHSCOPE_API_KEY=你的真实密钥
QWEN_MODEL=qwen-plus
PORT=3001
```

### 4. 手动构建一次

```bash
cd /root/jiandanwenda-robot
npm ci
npm run build
```

### 5. 配置 systemd

编辑：

```bash
nano /etc/systemd/system/jiandanwenda.service
```

推荐内容：

```ini
[Unit]
Description=Jiandanwenda Robot API Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/jiandanwenda-robot
ExecStart=/usr/bin/node /root/jiandanwenda-robot/server-dist/api/server.js
Restart=always
RestartSec=3
User=root
Group=root
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

执行：

```bash
systemctl daemon-reload
systemctl enable jiandanwenda
systemctl restart jiandanwenda
systemctl status jiandanwenda --no-pager
```

## 四、GitHub 里需要配置的 Secrets

进入仓库：

- `Settings`
- `Secrets and variables`
- `Actions`

至少配置这些：

### 1. `ALIYUN_HOST`

```text
114.55.98.126
```

### 2. `ALIYUN_SSH_PORT`

```text
22
```

### 3. `ALIYUN_USER`

按你当前环境填：

```text
root
```

### 4. `ALIYUN_SSH_PRIVATE_KEY`

这是 GitHub Actions 用来登录服务器的私钥全文，不是公钥。

### 5. `SERVER_APP_DIR`

按你当前环境填：

```text
/root/jiandanwenda-robot
```

### 6. `SERVER_SYSTEMD_SERVICE`

```text
jiandanwenda
```

### 7. `SERVER_ENV_FILE`

可选，但推荐配置。

内容直接填完整 `.env`：

```env
DASHSCOPE_API_KEY=你的真实密钥
QWEN_MODEL=qwen-plus
PORT=3001
```

## 五、最关键的前提

因为这套方案是“SSH 上服务器后再 `git pull`”，所以服务器自己必须能拉取 GitHub 仓库。

你需要确认服务器上执行下面命令不会报权限错：

```bash
cd /root/jiandanwenda-robot
git pull origin main
```

如果这里失败，GitHub Actions 也一定会失败。

## 六、以后怎么用

以后你的发布动作就是：

```bash
git add .
git commit -m "feat: 更新功能"
git push origin main
```

然后 GitHub Actions 会自动连到服务器部署。

## 七、出错时先看哪里

### 1. GitHub Actions 日志

进入仓库 `Actions`，看 `Deploy To Aliyun`。

### 2. 服务器服务日志

```bash
systemctl status jiandanwenda --no-pager
journalctl -u jiandanwenda -n 100 --no-pager
```

### 3. 健康检查

```bash
curl http://127.0.0.1:3001/api/health
```

## 八、推荐验证顺序

先手动验证服务器侧：

```bash
cd /root/jiandanwenda-robot
git pull origin main
npm ci
npm run build
systemctl restart jiandanwenda
curl http://127.0.0.1:3001/api/health
```

手动验证通过后，再执行一次：

```bash
git push origin main
```

再到 GitHub Actions 页面确认自动部署是否成功。
