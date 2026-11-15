import { apiKey } from '@better-auth/api-key';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { defineAuth } from 'void/auth';
import { env } from 'void/env';
import { sendAccountEmail } from './src/server/account-email';
import { workspaceAccountHeader } from './src/workspace-account';
export default defineAuth(({ defaults }) => ({
  ...defaults,
  emailAndPassword: {
    ...defaults.emailAndPassword,
    autoSignIn: true,
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ url, user }, request) =>
      sendAccountEmail('reset', user.email, url, request),
  },
  emailVerification: {
    expiresIn: 24 * 60 * 60,
    sendOnSignUp: true,
    sendVerificationEmail: ({ url, user }, request) =>
      sendAccountEmail('verify', user.email, url, request),
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/delete-user' && !ctx.body?.password) {
        throw new APIError('BAD_REQUEST', { message: 'Enter your current password.' });
      }
      // Only our session-authenticated settings routes may manage keys.
      if (ctx.request && ctx.path.startsWith('/api-key')) {
        throw new APIError('FORBIDDEN', { message: 'Use Settings → API keys.' });
      }
    }),
  },
  plugins: [
    ...(defaults.plugins ?? []),
    apiKey({
      defaultPrefix: 'pkmn_',
      enableSessionForAPIKeys: false,
      rateLimit: { enabled: true, maxRequests: 120, timeWindow: 60_000 },
    }),
  ],
  rateLimit: {
    ...defaults.rateLimit,
    customRules: {
      '/request-password-reset': { max: 3, window: 60 },
      '/send-verification-email': { max: 3, window: 60 },
    },
    storage: 'database',
  },
  telemetry: { enabled: false },
  user: {
    ...defaults.user,
    deleteUser: {
      beforeDelete: async (user, request) => {
        if (request?.headers.get(workspaceAccountHeader) !== user.id) {
          throw new APIError('FORBIDDEN', { message: 'Your account changed. Please reload.' });
        }
        // These auth-plugin records have no user foreign key. All collection,
        // session, credential, policy and audit rows cascade with the user.
        const db = (env.DB as D1Database).withSession('first-primary');
        await db.batch([
          db.prepare('DELETE FROM apikey WHERE referenceId = ?').bind(user.id),
          db.prepare('DELETE FROM verification WHERE value = ?').bind(user.id),
        ]);
      },
      enabled: true,
    },
  },
}));
