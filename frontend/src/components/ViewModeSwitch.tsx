import { FolderOpen, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export type ViewMode = 'project' | 'timeline';

interface ViewModeSwitchProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeSwitch({ value, onChange }: ViewModeSwitchProps) {
  return (
    <div className="flex rounded-lg bg-gray-100 p-1">
      <button
        onClick={() => onChange('project')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          value === 'project'
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        <FolderOpen className="w-4 h-4" />
        按项目
      </button>
      <button
        onClick={() => onChange('timeline')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
          value === 'timeline'
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        <Clock className="w-4 h-4" />
        时间线
      </button>
    </div>
  );
}
