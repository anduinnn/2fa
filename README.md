# 2FA Authenticator

[English](./README_EN.md)

基于 Cloudflare Workers + KV 的云端 2FA 认证器，支持跨设备同步。

## 功能特性

- **TOTP 生成**：兼容 Google Authenticator、Authy 等标准 TOTP 协议
- **云端同步**：数据存储在 Cloudflare KV，跨设备访问
- **端到端加密**：AES-256-GCM 加密，服务端只存储密文
- **零注册**：无需邮箱/手机号，用主密码即可创建账户
- **会话保持**：刷新页面自动恢复登录状态
- **深色模式**：自动跟随系统主题

## 技术架构

```
浏览器 <--HTTPS--> Cloudflare Worker <--KV API--> KV 存储
   |                    |
   | 客户端加密/解密     | 只存储密文
   | TOTP 生成          | API 路由
```

**安全设计**：
| 方面 | 措施 |
|------|------|
| 数据加密 | AES-256-GCM，客户端加密后传输 |
| 密钥派生 | PBKDF2，100,000 次迭代 |
| 用户标识 | 密码哈希（独立 PBKDF2，50,000 次迭代） |
| 传输安全 | Cloudflare 强制 HTTPS |

## 部署教程

### 前置条件

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)

### 步骤 1: 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 步骤 2: 登录 Cloudflare

```bash
wrangler login
```

### 步骤 3: 创建 KV 命名空间

```bash
# 进入项目目录
cd 2fa

# 创建生产环境 KV
wrangler kv namespace create DATA_KV
# 输出类似: { binding = "DATA_KV", id = "xxxxxxxxxxxx" }

# 创建预览环境 KV
wrangler kv namespace create DATA_KV --preview
# 输出类似: { binding = "DATA_KV", preview_id = "yyyyyyyyyyyy" }
```

### 步骤 4: 配置 wrangler.toml

将上一步输出的 `id` 和 `preview_id` 填入 `wrangler.toml`：

```toml
name = "2fa-sync"
main = "worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "DATA_KV"
id = "xxxxxxxxxxxx"        # 替换为你的 id
preview_id = "yyyyyyyyyyyy" # 替换为你的 preview_id

[[rules]]
type = "Text"
globs = ["**/*.html"]
```

### 步骤 5: 本地测试（可选）

```bash
wrangler dev
# 访问 http://localhost:8787
```

### 步骤 6: 部署

```bash
wrangler deploy
# 输出类似: Published 2fa-sync (https://2fa-sync.xxx.workers.dev)
```

部署完成后，访问输出的 URL 即可使用。

## 使用说明

### 首次使用（创建账户）

1. 访问部署后的 URL
2. 点击「首次使用? 创建账户」
3. 设置主密码（至少 4 个字符）
4. 确认密码后点击「设置密码」

### 登录

1. 输入主密码
2. 点击「解锁」

### 添加 2FA 密钥

1. 点击右上角「+」按钮
2. 输入名称（如：GitHub）
3. 输入 Base32 格式的密钥
4. 点击「添加」

### 使用验证码

- 点击验证码可复制到剪贴板
- 右侧圆环显示剩余有效时间（30 秒周期）

### 退出登录

点击左上角退出按钮，清除当前会话并返回登录页面。

## 注意事项

1. **密码不可找回**：忘记密码将无法恢复数据，请牢记主密码
2. **密码即账户**：相同密码 = 相同账户，不同设备用相同密码登录可同步数据
3. **会话有效期**：关闭浏览器标签页后会话失效，需重新输入密码
4. **网络依赖**：需要联网才能使用（数据存储在云端）

## 项目结构

```
2fa/
├── index.html      # 前端页面（HTML + CSS + JS）
├── worker.js       # Cloudflare Worker 入口
├── wrangler.toml   # Wrangler 配置文件
└── README.md       # 本文档
```

## License

MIT
