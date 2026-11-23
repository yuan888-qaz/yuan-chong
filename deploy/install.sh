#!/usr/bin/env bash
# 屿安代充 - 服务器一键部署脚本（Debian/Ubuntu，root 或 sudo 执行）
# 用法：
#   1. 把代码放到 /opt/yuan-chong（git clone 或上传）
#   2. cd /opt/yuan-chong && sudo bash deploy/install.sh
# 脚本会：装 Node 20 LTS（若缺）、npm install、写 .env（随机 JWT_SECRET）、配置并启动 systemd 服务
set -e

APP_DIR=/opt/yuan-chong
SERVICE=yuanchong
PORT=${PORT:-3000}

echo "==> 1/4 检查 Node.js"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]; then
  echo "未检测到 Node 18+，安装 Node 20 LTS（NodeSource）..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v), npm: $(npm -v)"

echo "==> 2/4 安装依赖"
cd "$APP_DIR"
npm install --omit=dev

echo "==> 3/4 生成 .env"
if [ ! -f "$APP_DIR/.env" ]; then
  SECRET=$(openssl rand -hex 32)
  cat > "$APP_DIR/.env" <<EOF
JWT_SECRET=$SECRET
PORT=$PORT
DB_PATH=$APP_DIR/data/yuanchong.db
EOF
  echo ".env 已生成（JWT_SECRET 为随机值）"
else
  echo ".env 已存在，跳过"
fi

echo "==> 4/4 配置并启动 systemd 服务"
# 复制 service 文件（按本目录路径替换）
sed "s#/opt/yuan-chong#$APP_DIR#g" "$APP_DIR/deploy/yuanchong.service" > /etc/systemd/system/$SERVICE.service
systemctl daemon-reload
systemctl enable --now $SERVICE
sleep 2
systemctl --no-pager status $SERVICE || true

echo ""
echo "完成！服务运行在 http://127.0.0.1:$PORT"
echo "客户端:  http://<服务器IP>:$PORT/client/index.html"
echo "后台:    http://<服务器IP>:$PORT/admin/login.html"
echo "查看日志: journalctl -u $SERVICE -f"
