import { RouterProvider } from '@tanstack/react-router';
import { Providers } from '@/app/providers';
import { router } from '@/app/router';
import { Toaster } from '@/components/ui/sonner';

export function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
      <Toaster />
    </Providers>
  );
}
