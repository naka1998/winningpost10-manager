import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createTestAppContainer, type TestAppContainerOptions } from '@/app/container.test-utils';
import { DatabaseContext } from '@/app/database-context';
import { RepositoryContext } from '@/app/repository-context';

/**
 * Render a component wrapped with DatabaseContext and RepositoryContext
 * backed by an in-memory test database.
 *
 * Optionally override individual repositories with mocks.
 */
export async function renderWithProviders(
  ui: ReactElement,
  options?: TestAppContainerOptions & Omit<RenderOptions, 'wrapper'>,
) {
  const { repositoryOverrides, ...renderOptions } = options ?? {};
  const container = await createTestAppContainer({ repositoryOverrides });

  return render(ui, {
    wrapper: ({ children }) => (
      <DatabaseContext.Provider value={{ db: container.db }}>
        <RepositoryContext.Provider value={container.repositories}>
          {children}
        </RepositoryContext.Provider>
      </DatabaseContext.Provider>
    ),
    ...renderOptions,
  });
}
