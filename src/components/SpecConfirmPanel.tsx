import { useEffect, useState } from 'react';
import { Check, Loader2, Pencil, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { getErrorMessage, isApiError, pipelineApi } from '@/lib/api';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { UserFriendlySpec } from '@/types/pipeline';

/**
 * 规格确认面板（确认门，协议见后端 docs/pipeline-approve.md）。
 * 面向非技术用户：只展示一句话总结 + 需求条目，技术规格原文折叠。
 * 注意：后端 modifications 仅存证不影响生成，所以不做功能勾选等伪交互；
 * 想改内容走「补充说明」→ 后端带反馈重生规格并再次推送 spec_ready。
 */
export default function SpecConfirmPanel({ spec }: { spec: UserFriendlySpec }) {
  const projectId = usePipelineStore((s) => s.projectId);
  const clearPendingSpec = usePipelineStore((s) => s.clearPendingSpec);

  const [mode, setMode] = useState<'view' | 'feedback' | 'waiting'>('view');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 新一版 spec_ready 到达后重置面板交互状态
  useEffect(() => {
    setMode('view');
    setFeedback('');
    setSubmitting(false);
  }, [spec]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await pipelineApi.approve({
        project_id: projectId ?? undefined,
        approved: true,
      });
      clearPendingSpec();
    } catch (err) {
      // 已确认/已超时自动通过：收起面板即可；其余错误提示并保留面板
      if (isApiError(err) && err.error === 'not_awaiting_approval') {
        clearPendingSpec();
      } else {
        toast(getErrorMessage(err, '确认失败，请重试'), {
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFeedback = async () => {
    const trimmed = feedback.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await pipelineApi.approve({
        project_id: projectId ?? undefined,
        approved: false,
        feedback: trimmed,
      });
      // 面板保持，等待后端重推 spec_ready
      setMode('waiting');
    } catch (err) {
      if (isApiError(err) && err.error === 'not_awaiting_approval') {
        clearPendingSpec();
      } else {
        toast(getErrorMessage(err, '提交失败，请重试'), {
          variant: 'destructive',
        });
        setMode('view');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-3 mb-3 rounded-lg border border-border bg-card p-4">
      <div className="mb-2 text-sm font-medium">
        🤖 我已经理解了你的需求
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{spec.summary}</p>

      {spec.requirements.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {spec.requirements.map((req, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
              <span>{req}</span>
            </li>
          ))}
        </ul>
      )}

      {spec.openQuestions.length > 0 && (
        <div className="mb-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-xs text-yellow-400">
          还有疑问：{spec.openQuestions.join('；')}
        </div>
      )}

      <details className="mb-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">
          技术规格详情（可选看）
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2">
          {JSON.stringify(spec.raw, null, 2)}
        </pre>
      </details>

      {mode === 'waiting' ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在按你的意见重新生成规格…
        </div>
      ) : mode === 'feedback' ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            className="h-20 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="用一句话说明想改的地方，例如：风格改成浅色、增加搜索功能…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setMode('view')}
            >
              返回
            </Button>
            <Button
              size="sm"
              disabled={submitting || !feedback.trim()}
              onClick={handleFeedback}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              提交修改意见
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            5 分钟无操作将自动按当前规格生成
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setMode('feedback')}
            >
              <Pencil className="h-3.5 w-3.5" />
              补充说明
            </Button>
            <Button size="sm" disabled={submitting} onClick={handleConfirm}>
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ThumbsUp className="h-3.5 w-3.5" />
              )}
              确认生成
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
