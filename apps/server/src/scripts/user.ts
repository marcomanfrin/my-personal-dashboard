import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { databaseUrl, loadEnvFile } from '../config/env';
import { createPgDb } from '../db/client';
import { createUsersService } from '../modules/auth/users';

const USAGE = `Usage: npm run user:create -- <email> [--name "Full Name"] [--reset]
  The password is asked interactively (or read from USER_PASSWORD).
  --reset  set a new password for an existing user and sign out all its sessions`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { name: { type: 'string' }, reset: { type: 'boolean', default: false } },
});
const [email] = positionals;
if (!email) {
  console.error(USAGE);
  process.exit(1);
}

/** Reads a line without echoing it. */
function askHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput(s: string): void; output: NodeJS.WriteStream };
  let prompted = false;
  out._writeToOutput = (s: string) => {
    if (!prompted) {
      out.output.write(s);
      prompted = true;
    }
  };
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    }),
  );
}

async function readPassword(): Promise<string> {
  if (process.env.USER_PASSWORD) return process.env.USER_PASSWORD;
  const first = await askHidden('Password: ');
  const second = await askHidden('Repeat password: ');
  if (first !== second) throw new Error('Passwords do not match');
  return first;
}

loadEnvFile();
const { db, close } = createPgDb(databaseUrl());
try {
  const password = await readPassword();
  const users = createUsersService({ db });
  const user = values.reset
    ? await users.setPassword(email, password)
    : await users.createUser(email, values.name ?? email.split('@')[0]!, password);
  console.log(`${values.reset ? 'Password updated for' : 'Created'} ${user.email} (${user.id})`);
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await close();
}
