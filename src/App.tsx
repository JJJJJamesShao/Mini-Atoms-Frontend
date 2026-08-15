import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toast';
import { queryClient } from '@/lib/queryClient';
import RootLayout from '@/routes/__root';
import HomePage from '@/routes/index';
import LoginPage from '@/routes/login';
import ProjectPage from '@/routes/project.$id';
import RegisterPage from '@/routes/register';
import { useAuthStore } from '@/stores/authStore';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'project/:id', element: <ProjectPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
]);

export default function App() {
  // 启动时从 localStorage 恢复登录态
  useEffect(() => {
    void useAuthStore.getState().restore();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}
