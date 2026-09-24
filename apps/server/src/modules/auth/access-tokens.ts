import { createSigner, createVerifier } from 'fast-jwt';

const ISSUER = 'command';
const AUDIENCE = 'command-dashboard';

/** Claims of a dashboard access token. `sub` is the user id. */
export interface AccessClaims {
  sub: string;
  email: string;
  name: string;
}

/** Short-lived HS256 JWTs. Stateless: revocation happens on the refresh token. */
export function createAccessTokens({ secret, ttlSeconds }: { secret: string; ttlSeconds: number }) {
  const signer = createSigner({
    key: secret,
    algorithm: 'HS256',
    expiresIn: ttlSeconds * 1000,
    iss: ISSUER,
    aud: AUDIENCE,
  });
  const verifier = createVerifier({
    key: secret,
    algorithms: ['HS256'],
    allowedIss: ISSUER,
    allowedAud: AUDIENCE,
    requiredClaims: ['sub', 'exp'],
  });

  return {
    ttlSeconds,
    sign: (claims: AccessClaims): string => signer({ ...claims }),
    /** The claims, or null when the token is malformed, forged or expired. */
    verify(token: string): AccessClaims | null {
      try {
        const { sub, email, name } = verifier(token) as AccessClaims;
        return typeof sub === 'string' ? { sub, email, name } : null;
      } catch {
        return null;
      }
    },
  };
}

export type AccessTokens = ReturnType<typeof createAccessTokens>;
