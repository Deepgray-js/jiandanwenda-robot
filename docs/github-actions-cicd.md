# GitHub Actions 自动部署到阿里云

本文档用于把当前项目配置成如下发布链路：

1. 你在本机修改代码并提交到 GitHub
2. 当你执行 `git push` 到 `main` 分支后
3. GitHub Actions 自动运行检查、测试和构建
4. 如果通过，则自动连接阿里云服务器
5. 服务器执行 `git pull + npm ci + npm run build + systemctl restart`

这个方案不使用 Docker，适合当前项目的 `Node.js + systemd + Nginx` 部署模式。

## 一、当前仓库里新增了哪些文件

本次已经为你准备好以下文件：

- `.github/workflows/deploy.yml`
- `deploy/linux/update-app.sh`
- `deploy/linux/jiandanwenda-deploy.sudoers.example`

它们的作用分别是：

- `deploy.yml`：GitHub Actions 自动部署工作流
- `update-app.sh`：服务器上的更新脚本
- `jiandanwenda-deploy.sudoers.example`：给部署用户开放指定 `systemctl` 权限的示例

## 二、推荐部署结构

建议服务器最终结构如下：

```bash
/opt/jiandanwenda_robot
├── .git
├── .env
├── dist
├── server-dist
└── ...
```

推荐配套关系：

- Nginx：对外提供网站入口
- systemd：守护 Node 服务
- GitHub Actions：触发自动部署
- 阿里云服务器：拉取并运行最新代码

## 三、你需要先在服务器上完成的一次性准备

### 1. 安装基础环境

如果服务器还没装 Node.js，请执行：

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

### 2. 创建部署目录并拉取项目

如果你的仓库是公开仓库：

```bash
cd /opt
sudo git clone <你的 GitHub 仓库地址> jiandanwenda_robot
sudo chown -R $USER:$USER /opt/jiandanwenda_robot
cd /opt/jiandanwenda_robot
```

如果你的仓库是私有仓库，建议服务器使用 Deploy Key 或 SSH Key 拉取。

### 3. 配置环境变量

```bash
cd /opt/jiandanwenda_robot
cp .env.example .env
```

编辑 `.env`：

```env
DASHSCOPE_API_KEY=你的真实密钥
QWEN_MODEL=qwen-plus
PORT=3001
```

说明：

- 如果你希望环境变量只保留在服务器上，就手动维护这个 `.env`
- 如果你希望每次 GitHub Actions 自动覆盖服务器 `.env`，请看本文后面的 `SERVER_ENV_FILE`

### 4. 首次安装依赖并构建

```bash
cd /opt/jiandanwenda_robot
npm ci
npm run build
```

### 5. 配置 systemd

复制示例文件：

```bash
sudo cp deploy/linux/jiandanwenda.service /etc/systemd/system/jiandanwenda.service
```

然后编辑：

```bash
sudo nano /etc/systemd/system/jiandanwenda.service
```

重点确认这些字段：

- `WorkingDirectory=/opt/jiandanwenda_robot`
- `ExecStart=/usr/bin/node /opt/jiandanwenda_robot/server-dist/api/server.js`
- `User=你的部署用户`
- `Group=你的部署用户组`

重新加载并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable jiandanwenda
sudo systemctl start jiandanwenda
sudo systemctl status jiandanwenda
```

### 6. 给部署用户开放有限 sudo 权限

这个步骤是为了让 GitHub Actions 登录服务器后，可以无密码重启服务。

先复制示例：

```bash
sudo cp deploy/linux/jiandanwenda-deploy.sudoers.example /etc/sudoers.d/jiandanwenda-deploy
```

再编辑：

```bash
sudo nano /etc/sudoers.d/jiandanwenda-deploy
```

把里面的 `deploy` 改成你实际用来 SSH 登录服务器的用户名。

比如你的部署用户叫 `ubuntu`，那就改成：

```bash
ubuntu ALL=NOPASSWD: /usr/bin/systemctl restart jiandanwenda
ubuntu ALL=NOPASSWD: /usr/bin/systemctl status jiandanwenda
```

保存后检查语法：

```bash
sudo visudo -cf /etc/sudoers.d/jiandanwenda-deploy
```

### 7. 验证服务器脚本可以单独运行

在服务器上手动跑一次：

```bash
cd /opt/jiandanwenda_robot
bash deploy/linux/update-app.sh
```

如果能成功执行，说明自动部署链路的服务器侧已经准备好了。

## 四、你需要在 GitHub 仓库里配置哪些 Secrets

进入你的 GitHub 仓库：

- `Settings`
- `Secrets and variables`
- `Actions`
- `New repository secret`

至少配置下面这些：

### 1. `ALIYUN_HOST`

填写你的服务器公网 IP：

```text
114.55.98.126
```

### 2. `ALIYUN_SSH_PORT`

如果你用默认 SSH 端口，就填：

```text
22
```

### 3. `ALIYUN_USER`

填写你用于登录服务器的用户名，例如：

```text
root
```

或：

```text
ubuntu
```

推荐使用普通部署用户，不建议长期使用 `root`。

### 4. `ALIYUN_SSH_PRIVATE_KEY`

填写一把可以登录服务器的私钥内容，推荐 `ed25519`。

如果你还没有，可以在本机生成：

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy"
```

然后：

- 把公钥内容追加到服务器用户的 `~/.ssh/authorized_keys`
- 把私钥完整内容保存到 GitHub Secret `ALIYUN_SSH_PRIVATE_KEY`

### 5. `SERVER_APP_DIR`

填写项目在服务器上的目录：

```text
/opt/jiandanwenda_robot
```

### 6. `SERVER_SYSTEMD_SERVICE`

填写 systemd 服务名：

```text
jiandanwenda
```

## 五、可选 Secret：自动同步服务器 .env

如果你希望 GitHub Actions 在每次部署时，自动把服务器 `.env` 覆盖成固定内容，那么再加一个 Secret：

### `SERVER_ENV_FILE`

这个 Secret 的值就是完整 `.env` 文件内容，例如：

```env
DASHSCOPE_API_KEY=sk-xxxx
QWEN_MODEL=qwen-plus
PORT=3001
```

说明：

- 配置后，每次部署时都会把它写入服务器 `${SERVER_APP_DIR}/.env`
- 不配置这个 Secret 时，工作流不会动服务器上的 `.env`
- 如果你担心密钥泄露，推荐把 `.env` 交给 GitHub Secrets 管理，而不是手工在本机改 `.env` 再想办法同步

## 六、工作流现在是怎么工作的

当你推送到 `main` 分支时，`.github/workflows/deploy.yml` 会执行这些动作：

1. 拉取最新仓库代码
2. 安装依赖
3. 执行 `npm run check`
4. 执行 `npm run test`
5. 执行 `npm run build`
6. 配置 SSH 私钥和 `known_hosts`
7. 如果设置了 `SERVER_ENV_FILE`，则先上传 `.env`
8. SSH 登录服务器并执行：

```bash
bash /opt/jiandanwenda_robot/deploy/linux/update-app.sh
```

这个脚本会继续执行：

```bash
git fetch
git checkout main
git pull --ff-only origin main
npm ci
npm run build
sudo systemctl restart jiandanwenda
sudo systemctl status jiandanwenda --no-pager
```

## 七、你之后的日常使用方式

当整套 CI/CD 配置完成后，你平时的工作流会变成：

```bash
git add .
git commit -m "feat: 更新功能"
git push origin main
```

然后：

- GitHub Actions 自动开始执行
- 如果检查和构建通过，就自动发布到阿里云服务器
- 服务器上的 Nginx 和 systemd 保持不变，只更新项目代码和构建产物

## 八、如果部署失败，应该先看哪里

### 1. 看 GitHub Actions 日志

进入仓库：

- `Actions`
- 点击最新一次 `Deploy To Aliyun`
- 看失败步骤是 `check`、`test`、`build`，还是 `ssh deploy`

### 2. 看服务器日志

```bash
sudo systemctl status jiandanwenda
journalctl -u jiandanwenda -n 100 --no-pager
```

### 3. 看健康检查

```bash
curl http://127.0.0.1:3001/api/health
```

## 九、你现在必须亲手完成的配置

这部分最关键，我直接列成清单。

你现在需要做的事情有：

1. 在阿里云服务器上安装 Node.js 22、git、nginx
2. 把项目克隆到 `/opt/jiandanwenda_robot`
3. 配好服务器 `.env`
4. 配好 `systemd`
5. 配好 `/etc/sudoers.d/jiandanwenda-deploy`
6. 准备一把给 GitHub Actions 使用的 SSH 私钥
7. 在 GitHub 仓库里配置 Secrets
8. 推送一次代码测试工作流

## 十、我建议你这样落地

最稳妥的做法是分两步：

### 第一步：先跑通服务器侧

先在服务器手动执行一次：

```bash
cd /opt/jiandanwenda_robot
npm ci
npm run build
sudo systemctl restart jiandanwenda
```

确认网站和接口都正常。

### 第二步：再启用 GitHub Actions 自动部署

等手动部署稳定后，再去配置 GitHub Secrets，然后 `push` 一次触发 Actions。

这样出了问题你更容易判断，是“服务器没配好”，还是“CI/CD 配错了”。
