import { getEmailMessages } from '@/i18n/email';
import type { Locale } from '@/i18n/config';
import { siteConfig } from '@/config/site';
import { siteUrl } from '@/lib/plans';

/**
 * Transactional email through Resend's REST API (free tier: 3,000 emails/month).
 *
 * Without RESEND_API_KEY nothing is sent and every function returns false — the
 * rest of the flow keeps working (the buyer still sees their key on the success
 * page, contact messages are still stored in the database).
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

async function send(to: string, subject: string, html: string, replyTo?: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return false;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!response.ok) {
      console.error('[email] Resend rejected the message', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[email] Resend unreachable', error);
    return false;
  }
}

function layout(body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f5fa;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#11101c">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="font-weight:700;font-size:18px;margin-bottom:24px">${escapeHtml(siteConfig.name)}</div>
<div style="background:#fff;border:1px solid #e4e3ec;border-radius:14px;padding:28px">${body}</div>
</div></body></html>`;
}

export async function sendLicenseEmail(params: {
  to: string;
  locale: Locale;
  licenseKey: string;
  plan: string;
}): Promise<boolean> {
  const t = getEmailMessages(params.locale);
  const html = layout(`
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(t.license.heading)}</h1>
    <p style="margin:0 0 16px;line-height:1.6">${escapeHtml(t.license.intro(params.plan))}</p>
    <div style="font-family:ui-monospace,Consolas,monospace;font-size:14px;background:#f6f5fa;border:1px solid #e4e3ec;border-radius:10px;padding:14px;word-break:break-all">${escapeHtml(params.licenseKey)}</div>
    <p style="margin:16px 0 0;line-height:1.6">${escapeHtml(t.license.howTo)}</p>
    <p style="margin:24px 0 0"><a href="${siteUrl()}/${params.locale}" style="background:#6c47ff;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;display:inline-block">${escapeHtml(t.license.cta)}</a></p>`);
  return send(params.to, t.license.subject, html, siteConfig.contact.email || undefined);
}

export async function sendRejectionEmail(params: { to: string; locale: Locale }): Promise<boolean> {
  const t = getEmailMessages(params.locale).rejected;
  const html = layout(`
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(t.heading)}</h1>
    <p style="margin:0;line-height:1.6">${escapeHtml(t.body)}</p>`);
  return send(params.to, t.subject, html, siteConfig.contact.email || undefined);
}

function ownerAddress(): string | null {
  return process.env.OWNER_EMAIL?.trim() || siteConfig.contact.email || null;
}

export async function sendContactNotification(params: {
  name: string | null;
  email: string;
  topic: string;
  message: string;
}): Promise<boolean> {
  const owner = ownerAddress();
  if (!owner) return false;
  const from = params.name ? `${escapeHtml(params.name)} &lt;${escapeHtml(params.email)}&gt;` : escapeHtml(params.email);
  const html = layout(`
    <h1 style="font-size:18px;margin:0 0 12px">New contact message</h1>
    <p style="margin:0 0 6px"><b>From:</b> ${from}</p>
    <p style="margin:0 0 16px"><b>Topic:</b> ${escapeHtml(params.topic)}</p>
    <div style="white-space:pre-wrap;line-height:1.6">${escapeHtml(params.message)}</div>`);
  return send(owner, `[${siteConfig.name}] ${params.topic}: ${params.name ?? params.email}`, html, params.email);
}

/** Tells the owner a buyer reports a payment on the external platform. */
export async function sendPaymentRequestNotification(params: {
  product: string;
  email: string;
  reference: string;
  message: string | null;
}): Promise<boolean> {
  const owner = ownerAddress();
  if (!owner) return false;
  const html = layout(`
    <h1 style="font-size:18px;margin:0 0 12px">New payment to confirm</h1>
    <p style="margin:0 0 6px"><b>Plan:</b> ${escapeHtml(params.product)}</p>
    <p style="margin:0 0 6px"><b>Email:</b> ${escapeHtml(params.email)}</p>
    <p style="margin:0 0 16px"><b>Paid as:</b> ${escapeHtml(params.reference)}</p>
    ${params.message ? `<div style="white-space:pre-wrap;line-height:1.6">${escapeHtml(params.message)}</div>` : ''}
    <p style="margin:24px 0 0"><a href="${siteUrl()}/ru/admin#payments" style="color:#6c47ff">Open the admin panel</a></p>`);
  return send(owner, `[${siteConfig.name}] Payment to confirm: ${params.product}`, html, params.email);
}
