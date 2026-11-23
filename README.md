# 屿安代充 · 用户客户端 + 管理后台

Express + SQLite + JWT 的完整前后端代充原型。含用户端（注册/登录/选游戏/下单/我的订单/个人中心）和管理后台（看板/订单处理/游戏商品上下架）。

## 技术栈
- 后端：Node.js + Express + better-sqlite3 + jsonwebtoken + bcryptjs
- 前端：原生 HTML/CSS/JS，由 Express 直接托管
- 数据库：SQLite（本地文件，无需单独装库）
- 鉴权：JWT，登录后存 localStorage，接口带 Authorization 头

## 本地启动
```bash
cd yuan-chong
npm install
npm start
```
> 首次启动若库为空会自动初始化演示账号与占位游戏，无需手动 seed。
> 需要重置数据时执行 `npm run seed`（会清表重建）。

环境变量（见 `.env.example`）：
- `PORT`：端口，默认 3000
- `JWT_SECRET`：JWT 签名密钥，生产必须改成随机长字符串
- `DB_PATH`：数据库文件路径，默认 `data/yuanchong.db`

## 演示账号
| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | admin | admin123 |
| 普通用户 | demo | 123456 |

也可以在客户端注册新账号。

## 访问入口
- 用户客户端：`/client/index.html`
- 管理后台：`/admin/login.html`
- 根路径 `/` 自动跳转到用户端

## 功能清单
### 用户端
- 注册 / 账号密码登录（JWT，7 天有效）
- 首页选择游戏、查看充值档位
- 下单填写区服、角色 ID、联系方式
- 我的订单（待处理/充值中/已完成/已取消）
- 个人中心（账号信息、订单统计）

### 管理后台
- 管理员登录（非 admin 角色 403 拦截）
- 数据看板：总订单、已完成、待处理、营业额、用户数
- 订单管理：按状态筛选、改状态（待处理→充值中→已完成/已取消）、写客服备注
- 游戏管理：新增/编辑/上下架
- 商品管理：新增商品、上架/下架

## 目录结构
```
yuan-chong/
├── server/
│   ├── index.js      # Express 入口 + 全部 API 路由 + 空库自动初始化
│   ├── db.js        # SQLite 建表（DB_PATH 可覆盖）
│   ├── auth.js      # JWT 签发与校验中间件
│   └── seed.js      # 种子数据（演示账号 + 占位游戏商品）
├── public/
│   ├── client/      # 用户端页面
│   └── admin/       # 后台页面
├── data/            # SQLite 数据库文件（运行后生成，已 gitignore）
├── deploy/          # VPS 部署：install.sh 一键脚本、systemd 服务、Nginx 示例
├── .env.example     # 环境变量模板
├── Procfile         # Heroku/Railway 启动声明
├── render.yaml      # Render Blueprint 配置
└── railway.json    # Railway 配置
```

## API 概览
- `POST /api/register` 注册　`POST /api/login` 登录　`GET /api/me` 当前用户
- `GET /api/games` 公开游戏+商品
- `POST /api/orders` 下单　`GET /api/orders/mine` 我的订单
- `GET /api/admin/stats` 看板　`GET /api/admin/orders` 订单列表
- `PATCH /api/admin/orders/:id/status` 改订单状态
- `GET/POST/PATCH /api/admin/games` 游戏管理
- `POST/PATCH /api/admin/goods` 商品管理

---

## 公网部署

项目已内置 Render / Railway / VPS 三套配置，首次启动空库自动建账号，无需手动跑 seed。

### 方式一：Render（免费，最简单）
1. 把本项目推到一个 GitHub 仓库。
2. Render 控制台 → New → Blueprint，选择该仓库（仓库根目录有 `render.yaml`）。
3. `JWT_SECRET` 会自动生成，无需手填。
4. 部署完成后访问 `https://<你的域名>/client/index.html`，后台 `/admin/login.html`。

> 注意：Render 免费版实例休眠后，内存文件系统会重置；需要长期保存订单请绑定付费持久磁盘，并把 `DB_PATH` 指向挂载目录。

### 方式二：Railway
1. Railway 新建项目 → 从 GitHub 仓库导入（根目录有 `railway.json`）。
2. 在 Variables 里添加 `JWT_SECRET`（随机长字符串）。
3. Railway 自动用 NIXPACKS 构建并执行 `node server/index.js`。
4. 在 Settings 生成公网域名，访问同上。

### 方式三：自己的 VPS / 云服务器（最稳，数据持久，无需绑卡）

适合阿里云/腾讯云轻量服务器、任何 Debian/Ubuntu 云主机。`deploy/` 目录已带一键脚本和 systemd 配置。

```bash
# 1. 把代码放到 /opt/yuan-chong（git clone 或上传均可）
sudo git clone https://github.com/yuan888-qaz/yuan-chong.git /opt/yuan-chong

# 2. 一键安装：装 Node 20、npm install、生成随机 JWT_SECRET、注册并启动 systemd 服务
cd /opt/yuan-chong
sudo bash deploy/install.sh
```

脚本完成后：
- 客户端：`http://<服务器IP>:3000/client/index.html`
- 管理后台：`http://<服务器IP>:3000/admin/login.html`
- 看日志：`journalctl -u yuanchong -f`
- 重启：`sudo systemctl restart yuanchong`

有域名时，用 `deploy/nginx.conf` 反代 80 端口，再用 `certbot --nginx` 申请 HTTPS。SQLite 文件落在 `data/yuanchong.db`，重启不丢。

> 国内云服务器需在安全组放行 3000（或 Nginx 的 80/443）端口；用域名访问时记得备案。

### 部署前必改
- **`JWT_SECRET`**：必须换成随机长字符串，否则 token 可被伪造。
- 管理员默认密码 `admin123` 上线后请在后台或直接改库更换。

## 说明
- 本项目是功能原型，未接真实支付，下单为待处理演示。
- 游戏名、商品、价格均为占位示例，可在后台直接增删改，也可改 `server/seed.js` 批量初始化。
