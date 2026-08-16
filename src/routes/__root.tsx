import { Navigate, Outlet } from 'react-router';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';

// 认证守卫 + 整体布局：Sidebar（固定 280px）+ 主内容区
export default function RootLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
