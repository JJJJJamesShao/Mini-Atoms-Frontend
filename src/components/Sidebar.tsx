import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2, Pin, PinOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { getErrorMessage, projectApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const { id: currentId } = useParams();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { data, isLoading } = useProjects();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);

  // 置顶项目优先，其余按创建时间倒序
  const projects = [...(data?.projects ?? [])].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['projects'] });

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const project = await projectApi.create({ title: trimmed });
      await refresh();
      setCreateOpen(false);
      setTitle('');
      navigate(`/project/${project.id}`);
    } catch (err) {
      toast(getErrorMessage(err, '创建项目失败'), { variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

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
          title="新建项目"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
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
            还没有项目，点击右上角 + 新建
          </p>
        )}
        {projects.map((p) => (
          <div key={p.id} className="group relative">
            <NavLink
              to={`/project/${p.id}`}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                currentId === p.id && 'bg-accent',
              )}
            >
              <div className="flex items-center gap-1.5 truncate">
                {p.pinned && (
                  <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{p.title}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {dayjs(p.created_at).format('MM-DD HH:mm')}
              </div>
            </NavLink>
            <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title={p.pinned ? '取消置顶' : '置顶'}
                onClick={() => handlePin(p)}
              >
                {p.pinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                title="删除项目"
                onClick={() => setDeleting(p)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
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

      {/* 新建项目对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建项目</DialogTitle>
            <DialogDescription>给项目起个名字</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="例如：待办事项应用"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating || !title.trim()}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
