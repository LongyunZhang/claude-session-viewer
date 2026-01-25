import { useMemo } from 'react';

interface HighlightTextProps {
  text: string;
  highlight: string;
  className?: string;
}

export function HighlightText({ text, highlight, className }: HighlightTextProps) {
  const parts = useMemo(() => {
    if (!highlight.trim()) {
      return [{ text, isHighlight: false }];
    }

    const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
    const splitText = text.split(regex);

    return splitText.map((part, index) => ({
      text: part,
      isHighlight: part.toLowerCase() === highlight.toLowerCase(),
      key: index,
    }));
  }, [text, highlight]);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.isHighlight ? (
          <mark
            key={index}
            className="bg-yellow-200 text-yellow-900 rounded px-0.5"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
