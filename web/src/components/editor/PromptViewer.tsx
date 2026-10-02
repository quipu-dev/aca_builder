import { Button } from '@/components/ui/button';
import { markdown } from '@codemirror/lang-markdown';
import CodeMirror from '@uiw/react-codemirror';
import { Check, Copy } from 'lucide-react';
import React from 'react';

export function PromptViewer({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = value ? value.split('\n').length : 0;
  const charCount = value ? value.length : 0;
  const estimatedTokens = Math.round(charCount / 3.8);

  return (
    <div className="flex h-full flex-col bg-slate-950 border border-slate-800/80 rounded-lg overflow-hidden">
      {/* 状态统计条 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 bg-slate-900/60 text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-4">
          <span>
            总行数: <strong className="text-slate-200">{lineCount}</strong>
          </span>
          <span>
            总字符数: <strong className="text-slate-200">{charCount}</strong>
          </span>
          <span>
            估算词元: <strong className="text-indigo-400">~{estimatedTokens}</strong>
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={!value}
          className="h-7 text-xs flex items-center gap-1.5"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? '已复制' : '复制输出'}
        </Button>
      </div>

      {/* 代码视口 */}
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={value}
          height="100%"
          extensions={[markdown()]}
          editable={false}
          theme="dark"
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: false,
          }}
          className="text-xs font-mono"
        />
      </div>
    </div>
  );
}
