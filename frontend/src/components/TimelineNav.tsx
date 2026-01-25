import { Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface TimelineNavProps {
  groups: Map<string, { count: number }>;
  activeGroup: string | null;
  onGroupClick: (group: string) => void;
}

export function TimelineNav({ groups, activeGroup, onGroupClick }: TimelineNavProps) {
  const groupEntries = Array.from(groups.entries());

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
        <Clock className="w-4 h-4" />
        时间线
      </h2>
      <nav className="space-y-1">
        {groupEntries.map(([group, { count }]) => (
          <button
            key={group}
            onClick={() => onGroupClick(group)}
            className={cn(
              "w-full text-left px-3 py-2 rounded text-sm transition-colors",
              "flex items-center justify-between",
              activeGroup === group
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <span>{group}</span>
            <span className={cn(
              "text-xs",
              activeGroup === group ? "text-blue-500" : "text-gray-400"
            )}>
              {count}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
