"""JSONL 解析器 - 解析 Claude Code 会话数据"""
import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Generator
from dateutil import parser as date_parser

from models import (
    Message, FileChange, SessionSummary, SessionDetail,
    SearchResult, Project, ToolCall
)


# Claude Code 数据目录
CLAUDE_DIR = Path.home() / ".claude"
PROJECTS_DIR = CLAUDE_DIR / "projects"
FILE_HISTORY_DIR = CLAUDE_DIR / "file-history"


def parse_timestamp(ts: str) -> datetime:
    """解析时间戳"""
    try:
        return date_parser.parse(ts)
    except:
        return datetime.now()


def extract_content(message: dict) -> str:
    """从消息中提取文本内容"""
    msg = message.get("message", {})
    content = msg.get("content", "")

    # 如果 content 是列表（多模态内容）
    if isinstance(content, list):
        texts = []
        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    texts.append(item.get("text", ""))
                # 跳过 tool_use，会在单独的工具卡片中展示
                # 跳过 thinking 类型，这是 Claude 的内部思考
            elif isinstance(item, str):
                texts.append(item)
        return "\n".join(texts)

    return str(content) if content else ""


def has_visible_content(message: dict) -> bool:
    """检查消息是否有可见内容（排除只有 thinking 的消息）"""
    msg = message.get("message", {})
    content = msg.get("content", "")

    # 字符串内容
    if isinstance(content, str):
        return bool(content.strip())

    # 列表内容 - 检查是否有 text 或 tool_use
    if isinstance(content, list):
        for item in content:
            if isinstance(item, dict):
                item_type = item.get("type")
                if item_type == "text" and item.get("text", "").strip():
                    return True
                elif item_type == "tool_use":
                    return True
            elif isinstance(item, str) and item.strip():
                return True

    return False


def extract_tool_calls(messages: List[dict]) -> List[str]:
    """提取会话中使用的工具列表"""
    tools = set()
    for msg in messages:
        content = msg.get("message", {}).get("content", [])
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict) and item.get("type") == "tool_use":
                    tools.add(item.get("name", "unknown"))
    return sorted(list(tools))


def parse_jsonl_file(file_path: Path) -> List[dict]:
    """解析单个 JSONL 文件"""
    records = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
    return records


def get_project_dirs() -> List[Path]:
    """获取所有项目目录"""
    if not PROJECTS_DIR.exists():
        return []

    dirs = []
    for item in PROJECTS_DIR.iterdir():
        if item.is_dir() and not item.name.startswith("."):
            dirs.append(item)
    return sorted(dirs, key=lambda x: x.name)


def get_session_files(project_dir: Path) -> List[Path]:
    """获取项目目录下的所有会话文件"""
    files = []
    for item in project_dir.iterdir():
        if item.is_file() and item.suffix == ".jsonl":
            # 排除 agent- 开头的子 agent 文件
            if not item.stem.startswith("agent-"):
                files.append(item)
    return sorted(files, key=lambda x: x.stat().st_mtime, reverse=True)


def project_path_to_name(encoded_path: str) -> str:
    """将编码的项目路径转换为显示名称"""
    # -Users-longyun-Documents-code -> ~/Documents/code
    if encoded_path.startswith("-"):
        path = encoded_path.replace("-", "/")
        # 替换用户目录
        home = str(Path.home())
        if path.startswith(home.replace("/", "/")):
            path = "~" + path[len(home):]
        return path
    return encoded_path


def get_all_sessions() -> List[SessionSummary]:
    """获取所有会话摘要"""
    sessions = []

    for project_dir in get_project_dirs():
        project_path = project_path_to_name(project_dir.name)
        project_name = project_path.split("/")[-1] if "/" in project_path else project_path

        for session_file in get_session_files(project_dir):
            records = parse_jsonl_file(session_file)
            if not records:
                continue

            # 过滤出用户和助手消息
            messages = [r for r in records if r.get("type") in ("user", "assistant")]
            if not messages:
                continue

            # 提取首条用户消息作为标题
            first_user_msg = next((m for m in messages if m.get("type") == "user"), None)
            title = ""
            if first_user_msg:
                title = extract_content(first_user_msg)[:100]  # 截取前100字符
                if len(extract_content(first_user_msg)) > 100:
                    title += "..."

            # 获取时间信息
            timestamps = [parse_timestamp(r.get("timestamp", "")) for r in records if r.get("timestamp")]
            created_at = min(timestamps) if timestamps else datetime.now()
            updated_at = max(timestamps) if timestamps else datetime.now()

            sessions.append(SessionSummary(
                id=session_file.stem,
                project_path=project_path,
                project_name=project_name,
                title=title or "(无标题)",
                created_at=created_at,
                updated_at=updated_at,
                message_count=len(messages),
                tool_calls=extract_tool_calls(records)
            ))

    # 按更新时间倒序排序
    sessions.sort(key=lambda x: x.updated_at, reverse=True)
    return sessions


def get_session_detail(session_id: str) -> Optional[SessionDetail]:
    """获取会话详情"""
    # 在所有项目目录中查找该会话
    for project_dir in get_project_dirs():
        session_file = project_dir / f"{session_id}.jsonl"
        if session_file.exists():
            records = parse_jsonl_file(session_file)
            if not records:
                return None

            project_path = project_path_to_name(project_dir.name)
            project_name = project_path.split("/")[-1] if "/" in project_path else project_path

            # 第一遍：收集所有 tool_result
            tool_results: Dict[str, str] = {}
            for record in records:
                if record.get("type") == "user":
                    msg_content = record.get("message", {}).get("content", [])
                    if isinstance(msg_content, list):
                        for item in msg_content:
                            if isinstance(item, dict) and item.get("type") == "tool_result":
                                tool_id = item.get("tool_use_id", "")
                                result_content = item.get("content", "")
                                if tool_id:
                                    # 截取结果，避免太长
                                    if isinstance(result_content, str):
                                        tool_results[tool_id] = result_content[:2000]
                                        if len(result_content) > 2000:
                                            tool_results[tool_id] += "\n... (truncated)"

            # 第二遍：解析消息
            messages = []
            file_changes = []

            for record in records:
                record_type = record.get("type")

                if record_type in ("user", "assistant"):
                    # 跳过只有 thinking 没有可见内容的消息
                    if not has_visible_content(record):
                        continue

                    content = extract_content(record)
                    tool_use = None
                    tool_calls = None

                    # 提取工具调用信息
                    msg_content = record.get("message", {}).get("content", [])
                    if isinstance(msg_content, list):
                        tool_use_items = [
                            item for item in msg_content
                            if isinstance(item, dict) and item.get("type") == "tool_use"
                        ]
                        if tool_use_items:
                            tool_use = tool_use_items
                            # 构建完整的工具调用信息（包含结果）
                            tool_calls = []
                            for item in tool_use_items:
                                tool_id = item.get("id", "")
                                tool_calls.append(ToolCall(
                                    id=tool_id,
                                    name=item.get("name", "unknown"),
                                    input=item.get("input", {}),
                                    result=tool_results.get(tool_id)
                                ))

                    messages.append(Message(
                        uuid=record.get("uuid", ""),
                        type=record_type,
                        content=content,
                        timestamp=parse_timestamp(record.get("timestamp", "")),
                        tool_use=tool_use if tool_use else None,
                        tool_calls=tool_calls if tool_calls else None
                    ))

                elif record_type == "file-history-snapshot":
                    snapshot = record.get("snapshot", {})
                    backups = snapshot.get("trackedFileBackups", {})
                    for file_path, info in backups.items():
                        file_changes.append(FileChange(
                            file_path=file_path,
                            backup_file=info.get("backupFileName"),
                            version=info.get("version", 1),
                            timestamp=parse_timestamp(info.get("backupTime", ""))
                        ))

            # 获取标题
            first_user_msg = next((m for m in messages if m.type == "user"), None)
            title = first_user_msg.content[:100] if first_user_msg else "(无标题)"
            if first_user_msg and len(first_user_msg.content) > 100:
                title += "..."

            # 获取时间
            timestamps = [m.timestamp for m in messages]
            created_at = min(timestamps) if timestamps else datetime.now()
            updated_at = max(timestamps) if timestamps else datetime.now()

            return SessionDetail(
                id=session_id,
                project_path=project_path,
                project_name=project_name,
                title=title,
                created_at=created_at,
                updated_at=updated_at,
                messages=messages,
                file_changes=file_changes
            )

    return None


def search_sessions(query: str, limit: int = 50) -> List[SearchResult]:
    """全文搜索会话"""
    results = []
    query_lower = query.lower()

    for project_dir in get_project_dirs():
        project_path = project_path_to_name(project_dir.name)
        project_name = project_path.split("/")[-1] if "/" in project_path else project_path

        for session_file in get_session_files(project_dir):
            records = parse_jsonl_file(session_file)

            # 获取会话标题
            messages = [r for r in records if r.get("type") in ("user", "assistant")]
            first_user_msg = next((m for m in messages if m.get("type") == "user"), None)
            title = extract_content(first_user_msg)[:50] if first_user_msg else "(无标题)"

            for record in records:
                if record.get("type") not in ("user", "assistant"):
                    continue

                content = extract_content(record)
                if query_lower in content.lower():
                    # 提取匹配片段
                    idx = content.lower().find(query_lower)
                    start = max(0, idx - 50)
                    end = min(len(content), idx + len(query) + 50)
                    matched = content[start:end]
                    if start > 0:
                        matched = "..." + matched
                    if end < len(content):
                        matched = matched + "..."

                    results.append(SearchResult(
                        session_id=session_file.stem,
                        project_name=project_name,
                        title=title,
                        timestamp=parse_timestamp(record.get("timestamp", "")),
                        matched_content=matched,
                        message_type=record.get("type", "unknown")
                    ))

                    if len(results) >= limit:
                        return results

    return results


def get_all_projects() -> List[Project]:
    """获取所有项目"""
    projects = []

    for project_dir in get_project_dirs():
        project_path = project_path_to_name(project_dir.name)
        project_name = project_path.split("/")[-1] if "/" in project_path else project_path
        session_count = len(get_session_files(project_dir))

        if session_count > 0:
            projects.append(Project(
                path=project_path,
                name=project_name,
                session_count=session_count
            ))

    projects.sort(key=lambda x: x.session_count, reverse=True)
    return projects
