#!/bin/bash

# Claude Session Viewer 启动脚本
# 一键启动后端和前端，并自动打开浏览器

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 清理函数：退出时关闭所有后台进程
cleanup() {
    log_info "正在关闭服务..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    log_success "服务已关闭"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 等待服务启动
wait_for_service() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if check_port $port; then
            return 0
        fi
        sleep 0.5
        attempt=$((attempt + 1))
    done
    return 1
}

echo ""
echo "================================================"
echo "     Claude Session Viewer 启动器"
echo "================================================"
echo ""

# 检查端口占用
BACKEND_PORT=8000
FRONTEND_PORT=5173

if check_port $BACKEND_PORT; then
    log_warn "端口 $BACKEND_PORT 已被占用，尝试关闭..."
    lsof -ti :$BACKEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

if check_port $FRONTEND_PORT; then
    log_warn "端口 $FRONTEND_PORT 已被占用，尝试关闭..."
    lsof -ti :$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# 检查后端依赖
log_info "检查后端依赖..."
cd "$BACKEND_DIR"

VENV_PYTHON="$BACKEND_DIR/.venv/bin/python"
VENV_PIP="$BACKEND_DIR/.venv/bin/pip"

# 创建虚拟环境（如果不存在）
if [ ! -f "$VENV_PYTHON" ]; then
    log_info "创建虚拟环境..."
    rm -rf .venv 2>/dev/null
    python3 -m venv .venv || { log_error "创建虚拟环境失败"; exit 1; }
fi

# 检查 uvicorn 是否已安装，未安装则安装依赖
if ! "$VENV_PYTHON" -c "import uvicorn" 2>/dev/null; then
    log_info "安装 Python 依赖..."
    "$VENV_PIP" install -q -r requirements.txt || { log_error "安装后端依赖失败"; exit 1; }
fi
log_success "后端依赖已就绪"

# 启动后端
log_info "启动后端服务 (端口 $BACKEND_PORT)..."
"$VENV_PYTHON" -m uvicorn main:app --reload --port $BACKEND_PORT > /tmp/claude-session-viewer-backend.log 2>&1 &
BACKEND_PID=$!

if wait_for_service $BACKEND_PORT "后端"; then
    log_success "后端服务已启动 (PID: $BACKEND_PID)"
else
    log_error "后端服务启动失败，查看日志: /tmp/claude-session-viewer-backend.log"
    cat /tmp/claude-session-viewer-backend.log
    exit 1
fi

# 检查前端依赖
log_info "检查前端依赖..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    log_info "首次运行，安装前端依赖..."
    npm install || { log_error "安装前端依赖失败"; exit 1; }
fi
log_success "前端依赖已就绪"

# 启动前端
log_info "启动前端服务 (端口 $FRONTEND_PORT)..."
npm run dev > /tmp/claude-session-viewer-frontend.log 2>&1 &
FRONTEND_PID=$!

if wait_for_service $FRONTEND_PORT "前端"; then
    log_success "前端服务已启动 (PID: $FRONTEND_PID)"
else
    log_error "前端服务启动失败，查看日志: /tmp/claude-session-viewer-frontend.log"
    cat /tmp/claude-session-viewer-frontend.log
    cleanup
    exit 1
fi

# 等待一下确保服务完全就绪
sleep 1

# 打开浏览器
FRONTEND_URL="http://localhost:$FRONTEND_PORT"
log_info "打开浏览器: $FRONTEND_URL"
open "$FRONTEND_URL"

echo ""
echo "================================================"
log_success "所有服务已启动！"
echo ""
echo "  前端: $FRONTEND_URL"
echo "  后端: http://localhost:$BACKEND_PORT"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "================================================"
echo ""

# 保持脚本运行，等待用户中断
wait
