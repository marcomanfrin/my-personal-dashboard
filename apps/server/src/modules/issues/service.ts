import type { Issue, IssuePatch } from '@argus/shared';
import { createResourceService, type ResourceServiceDeps } from '../../lib/resource-service';
import { createIssuesRepository } from './repository';

export function createIssuesService(deps: ResourceServiceDeps) {
  const base = createResourceService<Issue>('issues', createIssuesRepository, deps);
  return {
    resource: base.resource,
    repository: base.repository,
    get: base.get,
    list: () => base.list(),
    /** "Acknowledge" is `{ acknowledged: true }`. */
    update: (id: string, patch: IssuePatch) => base.update(id, patch),
  };
}

export type IssuesService = ReturnType<typeof createIssuesService>;
