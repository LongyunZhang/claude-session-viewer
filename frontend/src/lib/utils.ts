import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  // 使用日历天比较，而不是原始时间差
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

/**
 * 格式化完整日期时间
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 截取文本
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * 获取日期所属分组
 * 分组顺序：今天、上周、本月、然后按月份倒序
 */
export function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  // 重置时间到当天开始
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffDays = Math.floor((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24));

  // 今天
  if (diffDays === 0) return '今天';

  // 计算上周范围（周一为一周开始）
  const dayOfWeek = today.getDay() || 7;
  const mondayThisWeek = new Date(today);
  mondayThisWeek.setDate(today.getDate() - dayOfWeek + 1);

  const mondayLastWeek = new Date(mondayThisWeek);
  mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);

  // 上周
  if (targetDay >= mondayLastWeek && targetDay < mondayThisWeek) {
    return '上周';
  }

  // 本月（不含今天和上周）
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (targetDay >= firstDayThisMonth && targetDay < mondayLastWeek) {
    return '本月';
  }

  // 更早的按月份分组
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月`;
}

/**
 * 生成分组排序键（用于排序）
 * 排序顺序：今天 → 上周 → 本月 → 按月份倒序（最近的月份在前）
 */
function getGroupSortKey(group: string): number {
  if (group === '今天') return 0;
  if (group === '上周') return 1;
  if (group === '本月') return 2;

  // 月份格式：2024年12月 -> 提取年月用于排序
  const match = group.match(/(\d+)年(\d+)月/);
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    // 时间越近，year*12+month 越大，减去后越小，排序越靠前
    return 100000 - (year * 12 + month);
  }
  return 999999;
}

/**
 * 按日期分组会话
 */
export function groupSessionsByDate<T extends { updated_at: string }>(
  sessions: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  // 分组会话
  sessions.forEach(session => {
    const group = getDateGroup(session.updated_at);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(session);
  });

  // 按分组排序
  const sortedGroups = Array.from(groups.entries()).sort(
    (a, b) => getGroupSortKey(a[0]) - getGroupSortKey(b[0])
  );

  return new Map(sortedGroups);
}

/**
 * 生成分组的 ID（用于滚动定位）
 */
export function getGroupId(group: string): string {
  return `timeline-group-${group.replace(/\s+/g, '-')}`;
}
