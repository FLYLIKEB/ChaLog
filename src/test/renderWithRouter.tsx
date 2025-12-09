import { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RenderOptions, render } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';

interface RouterRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: RouterRenderOptions = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

