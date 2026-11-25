import { escapeHtml } from './security.ts';

interface LayoutOptions {
  heading: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}

/**
 * Shared Architectural Stone email shell matching UdharPe's UI:
 * #F4F4F5 limestone backdrop, #FFFFFF card, 1px #D4D4D8 border, #18181B charcoal CTA.
 */
export function renderArchitecturalEmail({
  heading,
  bodyHtml,
  ctaText,
  ctaUrl,
  footerNote = 'If you did not request this email, you can safely ignore it.',
}: LayoutOptions): string {
  const safeHeading = escapeHtml(heading);
  const safeFooter = escapeHtml(footerNote);
  const ctaBlock = ctaText && ctaUrl
    ? `
      <div style="margin: 28px 0 8px 0;">
        <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
          ${escapeHtml(ctaText)}
        </a>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeHeading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; color: #18181b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #d4d4d8; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 20px 28px; border-bottom: 1px solid #e4e4e7;">
              <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.03em; color: #18181b;">UdharPe</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <h1 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: #18181b;">
                ${safeHeading}
              </h1>
              <div style="font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${bodyHtml}
              </div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background-color: #fafafa; border-top: 1px solid #e4e4e7; font-size: 13px; line-height: 1.5; color: #71717a;">
              ${safeFooter}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderOnboardingEmail({
  firmName,
  ownerName,
  actionLink,
}: {
  firmName?: string;
  ownerName?: string;
  actionLink: string;
}) {
  const safeFirm = escapeHtml(firmName || 'your firm');
  const greeting = ownerName ? `Hello ${escapeHtml(ownerName)},` : 'Hello,';
  return {
    subject: `Welcome to UdharPe, ${String(firmName || 'your firm').slice(0, 80)}`,
    html: renderArchitecturalEmail({
      heading: 'Confirm your email address',
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">${greeting}</p>
        <p style="margin: 0 0 12px 0;">Your ledger for <strong>${safeFirm}</strong> is ready on UdharPe.</p>
        <p style="margin: 0;">Confirm your email address below to open your dashboard and start tracking customer credit and settlements.</p>
      `,
      ctaText: 'Confirm Email & Open Ledger',
      ctaUrl: actionLink,
    }),
  };
}

export function renderMagicLinkEmail({ actionLink }: { actionLink: string }) {
  return {
    subject: 'Your UdharPe Sign-In Link',
    html: renderArchitecturalEmail({
      heading: 'Sign in to UdharPe',
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">Click the button below to sign in to your UdharPe ledger. No password is required.</p>
        <p style="margin: 0; font-size: 13px; color: #52525b;">This single-use link expires shortly for your account security.</p>
      `,
      ctaText: 'Sign In to UdharPe',
      ctaUrl: actionLink,
    }),
  };
}

export function renderForgotPasswordEmail({ actionLink }: { actionLink: string }) {
  return {
    subject: 'Reset Your UdharPe Password',
    html: renderArchitecturalEmail({
      heading: 'Reset your password',
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">We received a request to reset the password for your UdharPe account.</p>
        <p style="margin: 0;">Use the button below to choose a new password.</p>
      `,
      ctaText: 'Reset Password',
      ctaUrl: actionLink,
    }),
  };
}

export function renderPendingBillEmail({
  customerName,
  firmName,
  amountFormatted,
  billNo,
  dueDate,
}: {
  customerName: string;
  firmName: string;
  amountFormatted: string;
  billNo?: string;
  dueDate?: string;
}) {
  const safeCustomer = escapeHtml(customerName);
  const safeFirm = escapeHtml(firmName);
  const billMeta = billNo
    ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #52525b;">Bill: <strong>${escapeHtml(billNo)}</strong>${dueDate ? ` · Due ${escapeHtml(dueDate)}` : ''}</p>`
    : '';

  return {
    subject: billNo
      ? `Payment Reminder: Bill ${billNo} from ${firmName}`
      : `Payment Reminder: ₹${amountFormatted} Outstanding — ${firmName}`,
    html: renderArchitecturalEmail({
      heading: 'Payment Reminder',
      bodyHtml: `
        <p style="margin: 0 0 12px 0;">Hello ${safeCustomer},</p>
        <p style="margin: 0 0 18px 0;">This is a friendly reminder from <strong>${safeFirm}</strong> regarding your pending balance.</p>
        <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 16px 20px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 13px; color: #52525b;">Pending Amount</p>
          <p style="margin: 4px 0 0 0; font-size: 28px; font-weight: 700; color: #dc2626; font-variant-numeric: tabular-nums;">₹${escapeHtml(amountFormatted)}</p>
          ${billMeta}
        </div>
        <p style="margin: 0 0 16px 0;">Kindly arrange for payment at your earliest convenience. If you have already settled this amount, please disregard this message.</p>
        <p style="margin: 0; color: #18181b;">Thank you,<br/><strong>${safeFirm}</strong></p>
      `,
      footerNote: `Sent on behalf of ${firmName} via UdharPe.`,
    }),
  };
}
