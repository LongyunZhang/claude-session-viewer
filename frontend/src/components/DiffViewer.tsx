import { useMemo } from 'react';
import * as Diff from 'diff';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  fileName?: string;
}

export function DiffViewer({ oldValue, newValue, fileName }: DiffViewerProps) {
  const diffLines = useMemo(() => {
    const changes = Diff.diffLines(oldValue, newValue);
    const lines: Array<{
      type: 'added' | 'removed' | 'unchanged';
      content: string;
      oldLineNum?: number;
      newLineNum?: number;
    }> = [];

    let oldLineNum = 1;
    let newLineNum = 1;

    changes.forEach((change) => {
      const changeLines = change.value.split('\n');
      // 移除最后一个空行（split 产生的）
      if (changeLines[changeLines.length - 1] === '') {
        changeLines.pop();
      }

      changeLines.forEach((line) => {
        if (change.added) {
          lines.push({
            type: 'added',
            content: line,
            newLineNum: newLineNum++,
          });
        } else if (change.removed) {
          lines.push({
            type: 'removed',
            content: line,
            oldLineNum: oldLineNum++,
          });
        } else {
          lines.push({
            type: 'unchanged',
            content: line,
            oldLineNum: oldLineNum++,
            newLineNum: newLineNum++,
          });
        }
      });
    });

    return lines;
  }, [oldValue, newValue]);

  // 统计变更
  const stats = useMemo(() => {
    const added = diffLines.filter((l) => l.type === 'added').length;
    const removed = diffLines.filter((l) => l.type === 'removed').length;
    return { added, removed };
  }, [diffLines]);

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
      {/* 文件头 */}
      {fileName && (
        <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-300 font-mono">{fileName}</span>
          <div className="flex items-center gap-2 text-xs">
            {stats.added > 0 && (
              <span className="text-green-400">+{stats.added}</span>
            )}
            {stats.removed > 0 && (
              <span className="text-red-400">-{stats.removed}</span>
            )}
          </div>
        </div>
      )}

      {/* Diff 内容 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {diffLines.map((line, index) => (
              <tr
                key={index}
                className={
                  line.type === 'added'
                    ? 'bg-green-900/30'
                    : line.type === 'removed'
                    ? 'bg-red-900/30'
                    : ''
                }
              >
                {/* 旧行号 */}
                <td className="w-12 px-2 py-0.5 text-right text-gray-500 select-none border-r border-gray-700">
                  {line.type !== 'added' ? line.oldLineNum : ''}
                </td>
                {/* 新行号 */}
                <td className="w-12 px-2 py-0.5 text-right text-gray-500 select-none border-r border-gray-700">
                  {line.type !== 'removed' ? line.newLineNum : ''}
                </td>
                {/* 变更标记 */}
                <td className="w-6 px-1 py-0.5 text-center select-none">
                  {line.type === 'added' && (
                    <span className="text-green-400">+</span>
                  )}
                  {line.type === 'removed' && (
                    <span className="text-red-400">-</span>
                  )}
                </td>
                {/* 代码内容 */}
                <td className="px-2 py-0.5 whitespace-pre">
                  <span
                    className={
                      line.type === 'added'
                        ? 'text-green-300'
                        : line.type === 'removed'
                        ? 'text-red-300'
                        : 'text-gray-300'
                    }
                  >
                    {line.content || ' '}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
