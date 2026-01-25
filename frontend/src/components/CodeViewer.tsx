import { useMemo } from 'react';

interface CodeViewerProps {
  code: string;
  fileName?: string;
  maxHeight?: string;
}

export function CodeViewer({ code, fileName, maxHeight = '300px' }: CodeViewerProps) {
  const lines = useMemo(() => {
    return code.split('\n');
  }, [code]);

  // 根据文件扩展名获取语言类型（用于未来的语法高亮）
  const getLanguage = (filename?: string) => {
    if (!filename) return 'text';
    const ext = filename.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
      svg: 'xml',
    };
    return langMap[ext || ''] || 'text';
  };

  const language = getLanguage(fileName);
  const lineNumWidth = String(lines.length).length;

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
      {/* 文件头 */}
      {fileName && (
        <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <span className="text-sm text-gray-300 font-mono truncate">{fileName}</span>
          <span className="text-xs text-gray-500">{language} · {lines.length} 行</span>
        </div>
      )}

      {/* 代码内容 */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-xs font-mono">
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="hover:bg-gray-800/50">
                {/* 行号 */}
                <td
                  className="px-2 py-0.5 text-right text-gray-500 select-none border-r border-gray-700 sticky left-0 bg-gray-900"
                  style={{ minWidth: `${lineNumWidth + 2}ch` }}
                >
                  {index + 1}
                </td>
                {/* 代码内容 */}
                <td className="px-3 py-0.5 whitespace-pre text-gray-300">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
