import { RouterProvider } from '@tanstack/react-router';
import { Providers } from '@/app/providers';
import { router } from '@/app/router';
import { ThemeProvider } from '@/app/theme-context';
import { Toaster } from '@/components/ui/sonner';

export function App() {
  return (
    <ThemeProvider>
      <Providers>
        <RouterProvider router={router} />
        <Toaster />
      </Providers>
    </ThemeProvider>
  );
}
