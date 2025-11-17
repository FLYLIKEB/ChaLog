import { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { RenderOptions, render } from '@testing-library/react';

interface RouterRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: RouterRenderOptions = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

