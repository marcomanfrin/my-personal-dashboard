import type { Project } from '@command/shared';
import { createResourceService, type ResourceServiceDeps } from '../../lib/resource-service';
import { createProjectsRepository } from './repository';

/** Projects are read-only for the user: the planning agent owns them. */
export function createProjectsService(deps: ResourceServiceDeps) {
  const base = createResourceService<Project>('projects', createProjectsRepository, deps);
  return {
    resource: base.resource,
    repository: base.repository,
    get: base.get,
    list: () => base.list(),
  };
}

export type ProjectsService = ReturnType<typeof createProjectsService>;
