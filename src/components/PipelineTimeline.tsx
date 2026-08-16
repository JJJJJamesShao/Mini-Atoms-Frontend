import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StageState } from '@/types/api';

const STATUS_STYLE: Record<
  StageState['status'],
  { icon: typeof Circle; className: string; label: string }
> = {
  pending: {
    icon: Circle,
    className: 'border-border text-muted-foreground',
    label: '等待',
  },
  active: {
    icon: Loader2,
    className: 'border-blue-500/50 text-blue-400',
    label: '进行中',
  },
  done: {
    icon: CheckCircle2,
    className: 'border-green-500/50 text-green-400',
    label: '完成',
  },
  failed: {
    icon: XCircle,
    className: 'border-destructive/50 text-destructive',
    label: '失败',
  },
};

export default function PipelineTimeline({ stages }: { stages: StageState[] }) {
  if (stages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        运行 Pipeline 后，这里会显示各阶段进度
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {stages.map((stage) => {
        const style = STATUS_STYLE[stage.status];
        const Icon = style.icon;
        return (
          <Card
            key={stage.stage}
            className={cn('transition-colors', style.className)}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  stage.status === 'active' && 'animate-spin',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {stage.stage}
                </div>
                {stage.detail && (
                  <div className="truncate text-xs text-muted-foreground">
                    {stage.detail}
                  </div>
                )}
              </div>
              <span className="shrink-0 text-xs">{style.label}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
