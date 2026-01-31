"""会话服务层：按来源聚合"""
from typing import List, Optional

from models import SessionSummary, SessionDetail, SearchResult, Project
from parser import (
    get_all_sessions as get_claude_sessions,
    get_session_detail as get_claude_session_detail,
    search_sessions as search_claude_sessions,
    get_all_projects as get_claude_projects,
)
from codex_parser import (
    get_codex_sessions,
    get_codex_session_detail,
    search_codex_sessions,
    get_codex_projects,
)


def normalize_source(source: Optional[str]) -> str:
    if not source:
        return "claude"
    source = source.lower()
    if source in ("claude", "codex"):
        return source
    return "claude"


def get_all_sessions(source: Optional[str] = None) -> List[SessionSummary]:
    source = normalize_source(source)
    if source == "claude":
        return get_claude_sessions()
    return get_codex_sessions()


def get_session_detail(session_id: str, source: Optional[str] = None) -> Optional[SessionDetail]:
    source = normalize_source(source)
    if source == "claude":
        return get_claude_session_detail(session_id)
    return get_codex_session_detail(session_id)


def search_sessions(query: str, limit: int = 50, source: Optional[str] = None) -> List[SearchResult]:
    source = normalize_source(source)
    if source == "claude":
        return search_claude_sessions(query, limit)
    return search_codex_sessions(query, limit)


def get_all_projects(source: Optional[str] = None) -> List[Project]:
    source = normalize_source(source)
    if source == "claude":
        return get_claude_projects()
    return get_codex_projects()
