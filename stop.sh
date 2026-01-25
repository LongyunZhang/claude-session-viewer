#!/bin/bash

# Claude Session Viewer 停止脚本

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }

echo ""
echo "正在停止 Claude Session Viewer 服务..."
echo ""

# 停止后端 (端口 8000)
if lsof -ti :8000 > /dev/null 2>&1; then
    log_info "停止后端服务 (端口 8000)..."
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    log_success "后端服务已停止"
else
    log_info "后端服务未运行"
fi

# 停止前端 (端口 5173)
if lsof -ti :5173 > /dev/null 2>&1; then
    log_info "停止前端服务 (端口 5173)..."
    lsof -ti :5173 | xargs kill -9 2>/dev/null || true
    log_success "前端服务已停止"
else
    log_info "前端服务未运行"
fi

echo ""
log_success "所有服务已停止"
echo ""
