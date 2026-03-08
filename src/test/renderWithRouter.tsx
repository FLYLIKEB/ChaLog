import { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RenderOptions, render } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '../contexts/AuthContext';

interface RouterRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: RouterRenderOptions = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="chalog-theme-test">
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

