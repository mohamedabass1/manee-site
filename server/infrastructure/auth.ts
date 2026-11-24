import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

export interface JwtTokenPayload {
  sub: string;
  unique_name: string;
  jti: string;
}

export function issueAccessToken(userId: string, username: string): {
  accessToken: string;
  expiresAtUtc: string;
} {
  const jti = crypto.randomUUID();
  const expiresInSeconds = config.jwt.expiryMinutes * 60;
  const expiresAtUtc = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const accessToken = jwt.sign(
    {
      sub: userId,
      unique_name: username,
      jti,
    },
    config.jwt.secret,
    {
      algorithm: 'HS256',
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      expiresIn: expiresInSeconds,
    },
  );

  return { accessToken, expiresAtUtc };
}

export function verifyAccessToken(token: string): JwtTokenPayload {
  const decoded = jwt.verify(token, config.jwt.secret, {
    algorithms: ['HS256'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    clockTolerance: config.jwt.clockToleranceSeconds,
  });

  if (typeof decoded !== 'object' || !decoded || !decoded.sub || !decoded.unique_name) {
    throw new Error('Invalid JWT claims');
  }

  return {
    sub: String(decoded.sub),
    unique_name: String(decoded.unique_name),
    jti: String(decoded.jti || ''),
  };
}
