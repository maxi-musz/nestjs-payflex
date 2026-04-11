import { marked } from 'marked';
import type { RendererThis, Tokens } from 'marked';
import { wrapInLayout } from 'src/common/mailer/email-layout';
import { BRAND } from 'src/common/mailer/email-brand';

/**
 * Marked v5+ / v17 uses token trees: block renderers must use `this.parser.parse(tokens)`
 * or `this.parser.parseInline(tokens)`, not a flat `text` field. The old `{ text }` handlers
 * left `**bold**` unparsed so emails showed literal asterisks.
 */
marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    paragraph(this: RendererThis, { tokens }: Tokens.Paragraph) {
      const body = this.parser.parseInline(tokens);
      return `<p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text};margin:0 0 16px 0">${body}</p>`;
    },

    heading(this: RendererThis, { tokens, depth }: Tokens.Heading) {
      const sizes: Record<number, string> = { 1: '24px', 2: '20px', 3: '17px' };
      const size = sizes[depth] || '15px';
      const body = this.parser.parseInline(tokens);
      return `<h${depth} style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:${size};font-weight:700;color:${BRAND.heading};margin:0 0 12px 0">${body}</h${depth}>`;
    },

    strong(this: RendererThis, { tokens }: Tokens.Strong) {
      const body = this.parser.parseInline(tokens);
      return `<strong style="font-weight:700;color:${BRAND.heading}">${body}</strong>`;
    },

    em(this: RendererThis, { tokens }: Tokens.Em) {
      const body = this.parser.parseInline(tokens);
      return `<em style="font-style:italic;color:${BRAND.text}">${body}</em>`;
    },

    link(this: RendererThis, { href, title, tokens }: Tokens.Link) {
      const body = this.parser.parseInline(tokens);
      const safeHref = href.replace(/"/g, '&quot;');
      const titleAttr =
        title != null && title !== ''
          ? ` title="${String(title).replace(/"/g, '&quot;')}"`
          : '';
      return `<a href="${safeHref}" target="_blank"${titleAttr} style="color:${BRAND.primary};text-decoration:underline">${body}</a>`;
    },

    blockquote(this: RendererThis, { tokens }: Tokens.Blockquote) {
      const body = this.parser.parse(tokens);
      return `<blockquote style="margin:0 0 16px 0;padding:12px 16px;border-left:4px solid ${BRAND.primary};background:${BRAND.bgMuted};border-radius:4px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;color:${BRAND.text}">${body}</blockquote>`;
    },

    hr(this: RendererThis) {
      return `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:24px 0">`;
    },
  },
});

export interface RecipientVars {
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * Render markdown into branded HTML. Shared content is parsed once;
 * per-recipient variables are interpolated at send time (on the HTML).
 */
export function renderMarkdownToHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;

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
