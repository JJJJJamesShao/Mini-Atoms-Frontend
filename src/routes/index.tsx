import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles } from 'lucide-react';
import PipelineChat from '@/components/PipelineChat';
import { usePipelineStore } from '@/stores/pipelineStore';

// 首页：空状态 + 新建引导，直接输入需求即可创建第一个项目
export default function HomePage() {
  const navigate = useNavigate();
  const projectId = usePipelineStore((s) => s.projectId);
  // 挂载时的 projectId：只有本次运行新创建的项目才触发跳转，
  // 避免运行中/完成后回到首页被立即弹回项目页
  const initialProjectId = useRef(projectId);

  // 从首页发起的生成收到 project_created 后，自动跳转到新项目工作区
  useEffect(() => {
    if (projectId && projectId !== initialProjectId.current) {
      navigate(`/project/${projectId}`);
    }
  }, [projectId, navigate]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <Sparkles className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">用一句话生成你的应用</h1>
      </div>
      <div className="mx-auto w-full max-w-2xl pb-6">
        <div className="h-64 rounded-lg border border-border bg-card">
          <PipelineChat />
        </div>
      </div>
    </div>
  );
}
