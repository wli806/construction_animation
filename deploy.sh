#!/bin/bash
# 4D BIM Construction Animation - 一键部署脚本
# 适用于 Ubuntu 22.04 / Debian 12
# 使用方法: sudo bash deploy.sh

set -e

DEPLOY_DIR="/var/www/construction-bim"
DB_NAME="construction_bim"
DB_USER="bim_user"
DB_PASS=$(openssl rand -base64 16)  # 自动生成随机密码
SECRET_KEY=$(openssl rand -base64 48)

echo "======================================="
echo "  4D BIM Construction Animation 部署"
echo "======================================="

# 1. 系统依赖
echo ">> 安装系统依赖..."
apt-get update -q
apt-get install -y -q python3 python3-pip python3-venv nodejs npm nginx postgresql postgresql-client

# 2. 数据库
echo ">> 配置 PostgreSQL..."
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

# 3. 拷贝代码
echo ">> 部署代码..."
mkdir -p ${DEPLOY_DIR}
cp -r backend ${DEPLOY_DIR}/
cp -r frontend ${DEPLOY_DIR}/

# 4. 后端依赖
echo ">> 安装 Python 依赖..."
python3 -m venv ${DEPLOY_DIR}/venv
${DEPLOY_DIR}/venv/bin/pip install --quiet -r ${DEPLOY_DIR}/backend/requirements.txt

# 5. .env 文件
echo ">> 生成 .env 配置..."
cat > ${DEPLOY_DIR}/backend/.env <<EOF
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
SECRET_KEY=${SECRET_KEY}
ACCESS_TOKEN_EXPIRE_MINUTES=720
CORS_ORIGINS=*
EOF

# 6. 前端构建
echo ">> 构建前端..."
cd ${DEPLOY_DIR}/frontend
npm install --silent
npm run build

# 前端 build 输出在 backend/dist，拷贝到 nginx 目录
mkdir -p /var/www/construction-bim/dist
cp -r ${DEPLOY_DIR}/backend/dist/* /var/www/construction-bim/dist/

# 7. Nginx
echo ">> 配置 Nginx..."
cp nginx.conf /etc/nginx/sites-available/construction-bim
ln -sf /etc/nginx/sites-available/construction-bim /etc/nginx/sites-enabled/construction-bim
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 8. systemd 服务
echo ">> 配置服务..."
cp construction-bim.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable construction-bim
systemctl restart construction-bim

# 9. 权限
chown -R www-data:www-data ${DEPLOY_DIR}
chmod -R 755 /var/www/construction-bim/dist

echo ""
echo "======================================="
echo "  部署完成！"
echo "======================================="
echo "数据库密码: ${DB_PASS}"
echo "（已写入 ${DEPLOY_DIR}/backend/.env，请妥善保存）"
echo ""
echo "请修改 nginx.conf 中的 server_name 为你的域名，"
echo "然后运行: sudo systemctl reload nginx"
echo "======================================="
