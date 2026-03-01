import { marked } from 'marked';
import { wrapInLayout } from 'src/common/mailer/email-layout';
import { BRAND } from 'src/common/mailer/email-brand';

/**
 * Converts markdown to email-safe HTML and wraps it in the
 * standard SmiPay branded layout (logo, footer, social links).
 *
 * Supports variable interpolation:
 *   {{first_name}}, {{last_name}}, {{email}}
 */

const renderer = new marked.Renderer();

renderer.paragraph = ({ text }) =>
  `<p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text};margin:0 0 16px 0">${text}</p>`;

renderer.heading = ({ text, depth }) => {
  const sizes: Record<number, string> = { 1: '24px', 2: '20px', 3: '17px' };
  const size = sizes[depth] || '15px';
  return `<h${depth} style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:${size};font-weight:700;color:${BRAND.heading};margin:0 0 12px 0">${text}</h${depth}>`;
};

renderer.link = ({ href, text }) =>
  `<a href="${href}" target="_blank" style="color:${BRAND.primary};text-decoration:underline">${text}</a>`;

renderer.list = (token: any) => {
  const tag = token.ordered ? 'ol' : 'ul';
  let body = '';
  for (const item of token.items) {
    body += renderer.listitem(item);
  }
  return `<${tag} style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text};margin:0 0 16px 0;padding-left:24px">${body}</${tag}>`;
};

renderer.listitem = (item: any) =>
  `<li style="margin-bottom:6px">${(renderer as any).parser.parse(item.tokens)}</li>`;

renderer.strong = ({ text }) =>
  `<strong style="font-weight:700;color:${BRAND.heading}">${text}</strong>`;

renderer.hr = () =>
  `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:24px 0">`;

renderer.blockquote = ({ text }) =>
  `<blockquote style="margin:0 0 16px 0;padding:12px 16px;border-left:4px solid ${BRAND.primary};background:${BRAND.bgMuted};border-radius:4px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;color:${BRAND.text}">${text}</blockquote>`;

marked.setOptions({ renderer, breaks: true, gfm: true });

export interface RecipientVars {
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * Render markdown into branded HTML. Shared content is parsed once,
 * per-recipient variables are interpolated at send time.
 */
export function renderMarkdownToHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown) as string;

  const innerHtml = `
    <td class="content-cell" style="padding:32px 40px">
      ${rawHtml}
    </td>`;

  return wrapInLayout('SmiPay Notification', innerHtml);
}

/**
 * Replace {{first_name}}, {{last_name}}, {{email}} with actual values.
 * Safe: unknown placeholders are left as-is.
 */
export function interpolateVariables(html: string, vars: RecipientVars): string {
  return html
    .replace(/\{\{first_name\}\}/gi, vars.first_name || 'Customer')
    .replace(/\{\{last_name\}\}/gi, vars.last_name || '')
    .replace(/\{\{email\}\}/gi, vars.email || '');
}
