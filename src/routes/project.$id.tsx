import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import PipelineChat from '@/components/PipelineChat';
import PipelineTimeline from '@/components/PipelineTimeline';
import PreviewFrame from '@/components/PreviewFrame';
import VersionCard from '@/components/VersionCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projectApi } from '@/lib/api';
import { usePipelineStore, type ChatMessage } from '@/stores/pipelineStore';
import type { Version } from '@/types/api';

// 项目工作区：左侧对话 + 右侧（预览 / 阶段 / 版本）
export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [selected, setSelected] = useState<Version | null>(null);
  // 默认"阶段"标签：预览为空时没有意义；有可预览内容后才允许切换
  const [tab, setTab] = useState<'preview' | 'timeline' | 'versions'>(
    'timeline',
  );

  // 切换项目时清空选中版本并回到阶段标签，避免串显上一项目
  useEffect(() => {
    setSelected(null);
    setTab('timeline');
  }, [id]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.get(id!),
    enabled: !!id,
  });

  const stages = usePipelineStore((s) => s.stages);
  const result = usePipelineStore((s) => s.result);
  const versionNo = usePipelineStore((s) => s.versionNo);
  const projectId = usePipelineStore((s) => s.projectId);

  // 本项目产生了新版本时刷新版本列表
  const queryClient = useQueryClient();
  useEffect(() => {
    if (projectId && projectId === id && versionNo !== null) {
      void queryClient.invalidateQueries({ queryKey: ['project', id] });
    }
  }, [projectId, versionNo, id, queryClient]);

  // 会话历史（查询驱动）：作为 prop 传给 PipelineChat，由其按归属决定
  // 显示实时现场还是历史——运行中切换项目互不干扰
  const historyMessages = useMemo<ChatMessage[]>(
    () =>
      (data?.messages ?? [])
        .filter((m) => ['user', 'assistant', 'system'].includes(m.role))
        .slice()
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: Date.parse(m.created_at),
        })),
    [data],
  );

  const versions = data?.versions ?? [];
  const latest = versions.length > 0 ? versions[versions.length - 1] : null;
  const current = selected ?? latest;

  // 实时结果仅属于产生它的项目，切换项目后回退到版本数据
  const liveFiles = projectId === id ? result?.files : null;
  const previewFiles = liveFiles ?? current?.files ?? [];
  const previewable = previewFiles.length > 0;

  // verify 阶段通过且有可预览内容时，自动从"阶段"切到"预览"（每次运行只切一次，
  // 之后用户手动切标签不再被拉回）
  const runStartedAt = usePipelineStore((s) => s.runStartedAt);
  const verifyPassed = stages.some(
    (s) => s.stage.startsWith('verify') && s.status === 'done',
  );
  const lastAutoSwitchRun = useRef<number | null>(null);
  useEffect(() => {
    if (
      verifyPassed &&
      previewable &&
      runStartedAt !== null &&
      lastAutoSwitchRun.current !== runStartedAt
    ) {
      lastAutoSwitchRun.current = runStartedAt;
      setTab('preview');
    }
  }, [verifyPassed, previewable, runStartedAt]);

  // 当前在预览标签但内容不再可预览（如切换项目）时回退到阶段标签
  useEffect(() => {
    if (tab === 'preview' && !previewable) setTab('timeline');
  }, [tab, previewable]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        项目加载失败
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[420px_1fr]">
      <div className="min-h-0 border-r border-border">
        <PipelineChat
          projectId={id}
          currentFiles={latest?.files}
          baseVersionNo={latest?.version_no}
          historyMessages={historyMessages}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-col p-4">
        <h1 className="mb-3 truncate text-lg font-semibold">
          {data.project.title}
        </h1>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList>
            <TabsTrigger value="preview" disabled={!previewable}>
              预览
            </TabsTrigger>
            <TabsTrigger value="timeline">阶段</TabsTrigger>
            <TabsTrigger value="versions">
              版本（{versions.length}）
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="min-h-0 flex-1">
            <div className="h-full">
              <PreviewFrame files={previewFiles} />
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="min-h-0 flex-1 overflow-y-auto">
            <PipelineTimeline stages={stages} />
          </TabsContent>

          <TabsContent value="versions" className="min-h-0 flex-1 overflow-y-auto">
            {versions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                还没有版本，发送第一条需求开始生成
              </p>
            ) : (
              <div className="space-y-2">
                {[...versions].reverse().map((v) => (
                  <VersionCard
                    key={v.id}
                    version={v}
                    selected={current?.id === v.id}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
