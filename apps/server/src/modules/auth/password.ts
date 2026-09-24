import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/** OWASP-recommended minimum for scrypt: N=2^17, r=8, p=1 (~128 MiB). */
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LEN = 64;
const MAX_MEM = 256 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 10;

const derive = (password: string, salt: Buffer, o: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LEN, { ...o, maxmem: MAX_MEM }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );

/** Format: `scrypt$N$r$p$<salt b64>$<hash b64>`, so parameters can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, N, r, p, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await derive(password, Buffer.from(salt, 'base64'), { N: +N!, r: +r!, p: +p! });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * Verified when the email is unknown, so a failed login costs the same time
 * whether or not the account exists (no user enumeration by timing).
 */
let dummyHash: Promise<string> | null = null;
export const dummyPasswordHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));
