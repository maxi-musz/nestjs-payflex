import { BRAND, COMPANY, LOGO_URL } from './email-brand';

/**
 * Shared email layout components used by all email templates.
 * Keeps branding consistent and DRY across every outgoing email.
 */

export const emailHead = (title: string) => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta content="telephone=no" name="format-detection">
  <title>${title}</title>
  <!--[if (mso 16)]><style type="text/css">a {text-decoration: none;}</style><![endif]-->
  <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]-->
  <style type="text/css">
    body, .body { margin: 0; padding: 0; width: 100%; height: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; border-spacing: 0px; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    a { text-decoration: none; }
    p { margin: 0; padding: 0; }
    .btn-primary {
      display: inline-block;
      background-color: ${BRAND.primary};
      color: #ffffff !important;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      mso-padding-alt: 0;
    }
    .btn-primary:hover { background-color: ${BRAND.primaryDark}; }
    @media only screen and (max-width:600px) {
      .wrapper { width: 100% !important; }
      .content-cell { padding-left: 20px !important; padding-right: 20px !important; }
      .logo-img { width: 100px !important; }
      h1 { font-size: 24px !important; }
    }
  </style>
</head>`;

export const emailBodyOpen = () => `
<body class="body" style="margin:0;padding:0;width:100%;height:100%;background-color:${BRAND.bgPage}">
  <table width="100%" cellspacing="0" cellpadding="0" role="none" style="background-color:${BRAND.bgPage};width:100%;height:100%">
    <tr>
      <td align="center" valign="top" style="padding:20px 0 40px 0">`;

export const emailHeader = () => `
        <!-- Header with logo -->
        <table class="wrapper" cellpadding="0" cellspacing="0" role="none" style="width:600px;max-width:600px">
          <tr>
            <td align="center" style="padding:24px 0 0 0">
              <a href="${COMPANY.website}" target="_blank" style="text-decoration:none">
                <img src="${LOGO_URL}" alt="${COMPANY.name}" class="logo-img" width="140" style="display:block;height:auto;border:0;outline:none;text-decoration:none">
              </a>
            </td>
          </tr>
        </table>`;

export const emailCardOpen = () => `
        <!-- Main card -->
        <table class="wrapper" cellpadding="0" cellspacing="0" role="none" style="width:600px;max-width:600px;margin-top:16px">
          <tr>
            <td style="background-color:${BRAND.bgCard};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06)">`;

export const emailCardClose = () => `
            </td>
          </tr>
        </table>`;

export const emailFooter = () => `
        <!-- Footer -->
        <table class="wrapper" cellpadding="0" cellspacing="0" role="none" style="width:600px;max-width:600px;margin-top:24px">
          <tr>
            <td align="center" style="padding:0 20px">
              <!-- Footer logo -->
              <a href="${COMPANY.website}" target="_blank" style="text-decoration:none">
                <img src="${LOGO_URL}" alt="${COMPANY.name}" width="100" style="display:block;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto">
              </a>
              <!-- Website URL -->
              <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;line-height:20px;color:${BRAND.muted};padding-top:12px">
                <a href="${COMPANY.website}" target="_blank" style="color:${BRAND.primary};text-decoration:none;font-weight:600">smipay.ng</a>
              </p>
              <!-- Need help? -->
              <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;line-height:20px;color:${BRAND.muted};padding-top:8px;padding-bottom:16px">
                Need help?&nbsp;
                <a href="${COMPANY.supportUrl}" target="_blank" style="color:${BRAND.primary};text-decoration:none;font-weight:600">smipay.ng/support</a>
              </p>
              <!-- Divider -->
              <table cellpadding="0" cellspacing="0" width="80%" role="presentation" style="margin:0 auto">
                <tr><td style="height:1px;background-color:${BRAND.border};font-size:0;line-height:0">&nbsp;</td></tr>
              </table>
              <!-- Social links -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:16px auto 0 auto">
                <tr>
                  <td align="center" valign="top" style="padding:0 12px">
                    <a target="_blank" href="${COMPANY.social.facebook}" style="text-decoration:none">
                      <img title="Facebook" src="https://fttbmkf.stripocdn.email/content/assets/img/social-icons/logo-colored/facebook-logo-colored.png" alt="Fb" width="28" height="28" style="display:block;border:0;outline:none;text-decoration:none">
                    </a>
                  </td>
                  <td align="center" valign="top" style="padding:0 12px">
                    <a target="_blank" href="${COMPANY.social.twitter}" style="text-decoration:none">
                      <img title="X" src="https://fttbmkf.stripocdn.email/content/assets/img/social-icons/logo-colored/x-logo-colored.png" alt="X" width="28" height="28" style="display:block;border:0;outline:none;text-decoration:none">
                    </a>
                  </td>
                  <td align="center" valign="top" style="padding:0 12px">
                    <a target="_blank" href="${COMPANY.social.instagram}" style="text-decoration:none">
                      <img title="Instagram" src="https://fttbmkf.stripocdn.email/content/assets/img/social-icons/logo-colored/instagram-logo-colored.png" alt="Inst" width="28" height="28" style="display:block;border:0;outline:none;text-decoration:none">
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Copyright -->
              <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;line-height:20px;color:${BRAND.muted};padding-top:16px">
                ${COMPANY.name} &copy; ${COMPANY.year}. All Rights Reserved.
              </p>
              <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;line-height:20px;color:${BRAND.muted};padding-bottom:8px">
                ${COMPANY.address}
              </p>
              <!-- Footer links -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto">
                <tr>
                  <td style="padding:4px 10px">
                    <a href="${COMPANY.website}" target="_blank" style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;color:${BRAND.primary};text-decoration:none">Visit Us</a>
                  </td>
                  <td style="padding:4px 10px;border-left:1px solid ${BRAND.border}">
                    <a href="${COMPANY.website}/privacy" target="_blank" style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;color:${BRAND.primary};text-decoration:none">Privacy Policy</a>
                  </td>
                  <td style="padding:4px 10px;border-left:1px solid ${BRAND.border}">
                    <a href="${COMPANY.website}/terms" target="_blank" style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;color:${BRAND.primary};text-decoration:none">Terms of Use</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;

export const emailBodyClose = () => `
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Wraps email content in the full branded layout:
 * head + body open + header (logo) + card open + CONTENT + card close + footer + body close
 */
export const wrapInLayout = (title: string, innerHtml: string) =>
  emailHead(title) +
  emailBodyOpen() +
  emailHeader() +
  emailCardOpen() +
  innerHtml +
  emailCardClose() +
  emailFooter() +
  emailBodyClose();
