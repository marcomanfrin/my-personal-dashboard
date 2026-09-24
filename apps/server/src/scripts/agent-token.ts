import { parseArgs } from 'node:util';
import { RESOURCES, Resource } from '@command/shared';
import { databaseUrl, loadEnvFile } from '../config/env';
import { createPgDb } from '../db/client';
import { createAgentsService } from '../modules/agents/service';
import { EventBus } from '../plugins/events-bus';

const USAGE = `Usage: npm run agent:token -- <name> [resources] [--rotate]
  resources  comma-separated, default all: ${RESOURCES.join(',')}
  --rotate   issue a new token for an existing agent`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { rotate: { type: 'boolean', default: false } },
});
const [name, scopeArg] = positionals;
if (!name) {
  console.error(USAGE);
  process.exit(1);
}
const scopes = scopeArg ? scopeArg.split(',').map((s) => Resource.parse(s.trim())) : [...RESOURCES];

loadEnvFile();
const { db, close } = createPgDb(databaseUrl());
try {
  const agents = createAgentsService({ db, bus: new EventBus() });
  const { agent, token } = values.rotate ? await agents.rotateToken(name) : await agents.register(name, scopes);
  console.log(`Agent "${agent.name}" (${agent.id})`);
  console.log(`Scopes: ${agent.scopes.join(', ')}`);
  console.log(`\nToken (shown once, store it in the agent's secrets):\n${token}`);
} finally {
  await close();
}
