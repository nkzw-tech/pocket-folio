import { sendEmail } from 'void/email';
import { env } from 'void/env';
import { logger } from 'void/log';
import translations from '../../translations/messages.json';
import { reserveAccountEmail } from './email-budget';

export async function sendAccountEmail(
  kind: 'reset' | 'verify',
  email: string,
  url: string,
  request?: Request,
) {
  if (!(await reserveAccountEmail(env.DB as D1Database, kind, email))) {
    // Keep the same response for reset requests, without exposing account
    // existence or whether a recipient's sending budget has been exhausted.
    return;
  }
  const preference =
    request?.headers.get('x-pkmn-locale') ?? request?.headers.get('accept-language') ?? 'en';
  const locale = preference.startsWith('de')
    ? 'de-DE'
    : preference.startsWith('ja')
      ? 'ja-JP'
      : undefined;
  const translate = (key: keyof typeof translations) => (locale ? translations[key][locale] : key);
  const subject = translate(
    kind === 'reset' ? 'Reset your Pocket Folio password' : 'Verify your Pocket Folio email',
  );
  const message = translate(
    kind === 'reset'
      ? 'Use this link to choose a new password. It expires in 30 minutes.'
      : 'Use this link to verify your email address. It expires in 24 hours.',
  );
  const result = await sendEmail({
    subject,
    text: `${message}\n\n${url}\n\n${translate('If you didn’t request this, you can ignore this email.')}`,
    to: email,
  });
  if (!result.ok) {
    // Operational errors only: never log recipients, message bodies or tokens.
    logger.error('Account email delivery failed', {
      codes:
        'error' in result
          ? [result.error.code]
          : result.deliveries
              .filter((delivery) => !delivery.ok)
              .map((delivery) => delivery.error.code),
      kind,
    });
    throw new Error('Account email could not be sent.');
  }
}
