import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePipeline } from '@/hooks/usePipeline';
import { cn } from '@/lib/utils';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { VersionFile } from '@/types/api';

interface PipelineChatProps {
  projectId?: string;
  currentFiles?: VersionFile[];
  baseVersionNo?: number;
}

const STATE_LABEL: Record<string, { text: string; className: string }> = {
  idle: { text: '空闲', className: 'bg-muted text-muted-foreground' },
  running: { text: '生成中', className: 'bg-blue-500/20 text-blue-400' },
  stopping: { text: '停止中', className: 'bg-yellow-500/20 text-yellow-400' },
  done: { text: '已完成', className: 'bg-green-500/20 text-green-400' },
  error: { text: '出错', className: 'bg-destructive/20 text-destructive' },
};

export default function PipelineChat({
  projectId,
  currentFiles,
  baseVersionNo,
}: PipelineChatProps) {
  const [input, setInput] = useState('');
  const { state, start, stop } = usePipeline();
  const messages = usePipelineStore((s) => s.messages);
  const questions = usePipelineStore((s) => s.questions);
  const mode = usePipelineStore((s) => s.mode);
  const bottomRef = useRef<HTMLDivElement>(null);

  const running = state === 'running' || state === 'stopping';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || running) return;
    setInput('');
    void start({
      input: trimmed,
      projectId,
      currentFiles,
      baseVersionNo,
    });
  };

  const badge = STATE_LABEL[state] ?? STATE_LABEL.idle;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">对话</span>
          {mode === 'mock' && (
            <span
              className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400"
              title="当前为演示模式（罐头数据），真实生成请联系管理员配置 LLM"
            >
              演示模式
            </span>
          )}
          {mode === 'live' && (
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
              真实生成
            </span>
          )}
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            badge.className,
          )}
        >
          {badge.text}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
              m.role === 'user' &&
                'ml-auto bg-primary text-primary-foreground',
              m.role === 'assistant' && 'bg-muted',
              m.role === 'system' &&
                'mx-auto bg-transparent text-center text-xs text-muted-foreground',
            )}
          >
            <div>{m.content}</div>
            {m.role !== 'system' && (
              <div
                className={cn(
                  'mt-1 text-[10px] opacity-60',
                  m.role === 'user' && 'text-right',
                )}
              >
                {dayjs(m.timestamp).format('HH:mm:ss')}
              </div>
            )}
          </div>
        ))}
        {questions && questions.length > 0 && (
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
            <div className="mb-1 font-medium text-yellow-400">
              需要确认的问题：
            </div>
            <ul className="list-inside list-disc space-y-0.5">
              {questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        <textarea
          className="h-20 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder={
            projectId ? '描述修改需求…' : '描述你想要的应用…'
          }
          value={input}
          disabled={running}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="mt-2 flex justify-end">
          {running ? (
            <Button variant="destructive" size="sm" onClick={() => void stop()}>
              <Square className="h-3.5 w-3.5" />
              停止
            </Button>
          ) : (
            <Button size="sm" onClick={handleSend} disabled={!input.trim()}>
              <Send className="h-3.5 w-3.5" />
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
