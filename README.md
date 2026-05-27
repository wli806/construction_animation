# 4D BIM 建筑动画系统

基于 **FastAPI + PostgreSQL + React + Three.js** 的全栈 4D BIM 施工动画平台。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 API | Python · FastAPI · SQLAlchemy |
| 数据库 | PostgreSQL |
| 认证 | JWT (python-jose) |
| 前端 | React 18 · Vite · React Router |
| 3D 引擎 | Three.js |
| 部署 | Nginx · uvicorn · systemd |

## 目录结构

```
construction_animation/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 入口
│   │   ├── models.py        # 数据库模型
│   │   ├── schemas.py       # Pydantic 模型
│   │   ├── crud.py          # 数据库操作
│   │   ├── auth.py          # JWT 认证
│   │   └── routers/         # API 路由
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 通用组件
│   │   └── api/client.js    # API 封装
│   └── package.json
├── nginx.conf               # Nginx 配置
├── construction-bim.service # systemd 服务
└── deploy.sh                # 一键部署脚本
```

## 本地开发

### 前置条件
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 1. 数据库

```bash
sudo -u postgres psql
CREATE USER bim_user WITH PASSWORD 'yourpassword';
CREATE DATABASE construction_bim OWNER bim_user;
\q
```

### 2. 后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 复制并编辑配置
cp .env.example .env
# 编辑 .env，填入数据库连接信息和 SECRET_KEY

uvicorn app.main:app --reload --port 8000
```

API 文档地址: http://localhost:8000/api/docs

### 3. 前端

```bash
cd frontend
npm install
npm run dev        # 启动开发服务器，地址 http://localhost:5173
```

前端通过 Vite proxy 自动将 `/api` 转发到 `localhost:8000`。

## 生产部署（Linux 服务器）

```bash
# 克隆代码到服务器
git clone <your-repo> /tmp/construction-bim
cd /tmp/construction-bim

# 修改 nginx.conf 中的 server_name
nano nginx.conf

# 一键部署（需要 root 权限）
sudo bash deploy.sh
```

脚本会自动完成：
- 安装 Python / Node.js / Nginx / PostgreSQL
- 创建数据库和用户
- 部署后端（Python venv + uvicorn）
- 构建前端并部署到 Nginx
- 配置 systemd 服务（开机自启）

## API 接口

```
POST /api/auth/register    注册
POST /api/auth/login       登录
GET  /api/auth/me          当前用户

GET  /api/projects         项目列表
POST /api/projects         创建项目
GET  /api/projects/{id}    项目详情（含任务）
PUT  /api/projects/{id}    更新项目
DELETE /api/projects/{id}  删除项目

POST   /api/projects/{id}/tasks   创建任务
PUT    /api/tasks/{id}            更新任务
DELETE /api/tasks/{id}            删除任务
```

## 任务类型

| 类型 | 说明 | 3D 效果 |
|------|------|---------|
| excavation | 挖掘 | 地基坑出现，挖掘机动画 |
| foundation | 基础 | 混凝土基础板出现 |
| walls/structure | 墙体/结构 | 墙体逐渐升高 |
| roof | 屋顶 | 屋顶出现 |
| finishing | 装修 | 窗户等细节 |

## 资源类型

| 类型 | 示例 | 3D 表现 |
|------|------|---------|
| worker | `{"type":"worker","count":4}` | 带安全帽工人在工地行走 |
| machine | `{"type":"machine","name":"挖掘机"}` | 对应机械模型（挖掘机/吊车/混凝土车）|
| material | `{"type":"material","name":"混凝土"}` | 仅显示在 HUD |
