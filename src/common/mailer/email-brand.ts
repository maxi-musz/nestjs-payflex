/**
 * Central brand configuration for all email templates.
 * Update LOGO_URL once you've uploaded SmiPay 2.png to your CDN.
 */

// ─── Logo URL ───
// Google Drive direct-image link (converted from the sharing URL).
// If this stops working, re-upload to Cloudinary / S3 and paste the direct URL here.
export const LOGO_URL = 'https://drive.google.com/uc?export=view&id=10R0OuqkvWS564G0TOrmrr5VA8rIc7Y0C';
// https://drive.google.com/file/d/10R0OuqkvWS564G0TOrmrr5VA8rIc7Y0C/view?usp=drive_link
// ─── Brand colors (from your Tailwind theme) ───
export const BRAND = {
  primary: '#ea580c',
  primaryDark: '#c2410c',
  black: '#0f172a',
  heading: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  border: '#e2e8f0',
  bgPage: '#f8fafc',
  bgCard: '#ffffff',
  bgMuted: '#f1f5f9',
  success: '#059669',
  successBg: '#ecfdf5',
  footerBg: '#0f172a',
  footerText: '#94a3b8',
  footerLink: '#ffffff',
} as const;

export const COMPANY = {
  name: 'SmiPay',
  tagline: 'Pay with a smile',
  year: new Date().getFullYear(),
  address: 'Lagos, Nigeria',
  website: 'https://smipay.ng',
  supportUrl: 'https://smipay.ng/support',
  supportEmail: 'support@smipay.ng',
  social: {
    facebook: 'https://web.facebook.com/smipay',
    twitter: 'https://x.com/smipay',
    instagram: 'https://instagram.com/smipay',
  },
} as const;
