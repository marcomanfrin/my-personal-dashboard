import type { Config } from './config/env';
import type { Db } from './db/client';
import { createActionsService } from './modules/actions/service';
import { createAgentsService } from './modules/agents/service';
import { createAuthService } from './modules/auth/service';
import { createUsersService } from './modules/auth/users';
import { createDashboardService } from './modules/dashboard/service';
import { createIngestService } from './modules/ingest/service';
import { createPreferencesService } from './modules/preferences/service';
import { createResourceServices } from './modules/resources';
import { EventBus } from './plugins/events-bus';

/** Composition root: every service, built once and wired by hand. */
export function createContainer(db: Db, config: Config) {
  const bus = new EventBus();
  const agents = createAgentsService({ db, bus });
  const resources = createResourceServices({ db, bus });
  return {
    config,
    db,
    bus,
    agents,
    auth: createAuthService({ db, config }),
    users: createUsersService({ db }),
    resources,
    actions: createActionsService({ db, bus }),
    preferences: createPreferencesService({ db, bus }),
    ingest: createIngestService({ db, bus, agents }),
    dashboard: createDashboardService({ db, config, resources, agents }),
  };
}

export type Container = ReturnType<typeof createContainer>;
