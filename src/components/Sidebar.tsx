import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Home, Loader2, MoreHorizontal, Pin, PinOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { getErrorMessage, projectApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/api';

interface ProjectItemMenuProps {
  project: Project;
  onPin: (project: Project) => void;
  onDelete: (project: Project) => void;
}

// 项目条目的"..."菜单。菜单打开期间必须保持触发按钮可见：
// 否则 Radix modal 锁定外部 pointer-events → group-hover 失效 → 按钮 display:none
// → 锚点矩形塌缩为 0，菜单跳到页面左上角
function ProjectItemMenu({ project, onPin, onDelete }: ProjectItemMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'absolute right-2 top-1.5',
        open ? 'block' : 'hidden group-hover:block',
      )}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="更多操作"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right">
          <DropdownMenuItem onSelect={() => onPin(project)}>
            {project.pinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
            {project.pinned ? '取消置顶' : '置顶'}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onSelect={() => onDelete(project)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { id: currentId } = useParams();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { data, isLoading } = useProjects();

  const [deleting, setDeleting] = useState<Project | null>(null);

  // 置顶项目优先，其余按创建时间倒序
  const projects = [...(data?.projects ?? [])].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['projects'] });

  const handlePin = async (project: Project) => {
    try {
      await projectApi.pin(project.id, !project.pinned);
      await refresh();
    } catch (err) {
      toast(getErrorMessage(err, '操作失败'), { variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await projectApi.delete(deleting.id);
      await refresh();
      if (deleting.id === currentId) navigate('/');
      setDeleting(null);
    } catch (err) {
      toast(getErrorMessage(err, '删除失败'), { variant: 'destructive' });
    }
  };

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between p-4">
        <span className="text-lg font-bold tracking-tight">Mini Atoms</span>
        <Button
          variant="outline"
          size="icon"
          title="回到首页"
          onClick={() => navigate('/')}
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading && (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {!isLoading && projects.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            还没有项目，在首页输入需求即可生成
          </p>
        )}
        {projects.map((p) => (
          <div key={p.id} className="group relative">
            <NavLink
              to={`/project/${p.id}`}
              className={cn(
                // pr-10 为右侧"..."按钮预留空间，长标题 truncate 不侵入按钮区
                'block rounded-md px-3 py-2 pr-10 text-sm transition-colors hover:bg-accent',
                currentId === p.id && 'bg-accent',
              )}
            >
              <div className="flex items-center gap-1.5 truncate">
                {p.status === 'summarizing' ? (
                  <>
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                    <span className="truncate text-muted-foreground">
                      {p.title}
                    </span>
                  </>
                ) : (
                  <>
                    {p.pinned && (
                      <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{p.title}</span>
                  </>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {dayjs(p.created_at).format('MM-DD HH:mm')}
              </div>
            </NavLink>
            <ProjectItemMenu project={p} onPin={handlePin} onDelete={setDeleting} />
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-between border-t border-border p-3">
        <span className="truncate text-sm text-muted-foreground">
          {user?.email}
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          退出
        </Button>
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除项目</DialogTitle>
            <DialogDescription>
              确定删除「{deleting?.title}」吗？该操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
