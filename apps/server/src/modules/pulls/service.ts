import type { PullRequest, PullRequestPatch } from '@argus/shared';
import { createResourceService, type ResourceServiceDeps } from '../../lib/resource-service';
import { createPullsRepository } from './repository';

export function createPullsService(deps: ResourceServiceDeps) {
  const base = createResourceService<PullRequest>('pulls', createPullsRepository, deps);
  return {
    resource: base.resource,
    repository: base.repository,
    get: base.get,
    list: () => base.list(),
    /** "Mark reviewed" is `{ reviewRequested: false }`. */
    update: (id: string, patch: PullRequestPatch) => base.update(id, patch),
  };
}

export type PullsService = ReturnType<typeof createPullsService>;
