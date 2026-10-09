import { cookieSessionStrategy } from './cookie-strategy';
import type { AuthStrategy } from './types';

/**
 * The active authentication strategy: the ONE line to change when switching (docs/auth.md).
 * The template ships the httpOnly-cookie session strategy (docs/auth.md).
 */
export const authStrategy: AuthStrategy = cookieSessionStrategy;
