import { BRAND, COMPANY, LOGO_URL } from './email-brand';
import { wrapInLayout } from './email-layout';

// ──────────────────────────────────────────────────────────
// OTP VERIFICATION
// ──────────────────────────────────────────────────────────

export const otpVerificationCodeTemplate = (
  email: string,
  otp: string,
  expiryTime: string,
): string => {
  const content = `
              <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <!-- Heading -->
                <tr>
                  <td align="center" class="content-cell" style="padding:32px 40px 0 40px">
                    <h1 style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:28px;font-weight:700;line-height:34px;color:${BRAND.heading}">
                      Confirm Your Email
                    </h1>
                  </td>
                </tr>
                <!-- Body text -->
                <tr>
                  <td align="center" class="content-cell" style="padding:16px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      You've received this message because your email address
                      <strong>${email}</strong> has been registered on ${COMPANY.name}.
                      Please enter the <strong>OTP</strong> below to verify your email address and
                      confirm that you are the owner.
                    </p>
                  </td>
                </tr>
                <!-- Expiry notice -->
                <tr>
                  <td align="center" class="content-cell" style="padding:8px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;line-height:20px;color:${BRAND.muted}">
                      OTP expires in ${expiryTime}
                    </p>
                  </td>
                </tr>
                <!-- OTP code block with logo -->
                <tr>
                  <td align="center" style="padding:24px 40px">
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td align="center" style="background-color:${BRAND.primary};border-radius:12px;padding:16px 40px">
                          <img src="${LOGO_URL}" alt="${COMPANY.name}" width="28" style="display:inline-block;height:auto;border:0;outline:none;text-decoration:none;vertical-align:middle;margin-right:10px"><!--
                          --><span style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:32px;font-weight:700;letter-spacing:8px;color:#ffffff;mso-line-height-rule:exactly;line-height:40px;vertical-align:middle">${otp}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Confirmation note -->
                <tr>
                  <td align="center" class="content-cell" style="padding:0 40px 8px 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;line-height:22px;color:${BRAND.text}">
                      Once confirmed, this email will be uniquely associated with your account.
                    </p>
                  </td>
                </tr>
                <!-- Disregard notice -->
                <tr>
                  <td align="center" class="content-cell" style="padding:0 40px 32px 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;line-height:20px;color:${BRAND.muted}">
                      If you did not register with us, please disregard this email.
                    </p>
                  </td>
                </tr>
              </table>`;

  return wrapInLayout('Confirm Your Email', content);
};

// ──────────────────────────────────────────────────────────
// WELCOME EMAIL
// ──────────────────────────────────────────────────────────

export const welcomeEmail = (firstName: string): string => {
  const content = `
              <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <!-- Orange accent bar -->
                <tr>
                  <td style="height:4px;background-color:${BRAND.primary};font-size:0;line-height:0">&nbsp;</td>
                </tr>
                <!-- Heading -->
                <tr>
                  <td align="left" class="content-cell" style="padding:32px 40px 0 40px">
                    <h1 style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:28px;font-weight:700;line-height:34px;color:${BRAND.heading}">
                      Welcome to ${COMPANY.name}! 🎉
                    </h1>
                  </td>
                </tr>
                <!-- Greeting -->
                <tr>
                  <td align="left" class="content-cell" style="padding:20px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:16px;line-height:26px;color:${BRAND.text}">
                      Dear <strong>${firstName}</strong>,
                    </p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td align="left" class="content-cell" style="padding:12px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:26px;color:${BRAND.text}">
                      We're thrilled to have you join the ${COMPANY.name} family! Your account is all set up and ready to go.
                    </p>
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:26px;color:${BRAND.text};padding-top:12px">
                      With ${COMPANY.name}, you can buy airtime, data, pay bills, and do so much more &mdash; all from the comfort of your phone.
                    </p>
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:26px;color:${BRAND.text};padding-top:12px">
                      If there's anything we can do to make your experience even better, please don't hesitate to let us know. We appreciate your feedback and are always looking for ways to improve.
                    </p>
                  </td>
                </tr>
                <!-- CTA button -->
                <tr>
                  <td align="center" style="padding:28px 40px">
                    <a href="${COMPANY.website}" target="_blank" class="btn-primary" style="display:inline-block;background-color:${BRAND.primary};color:#ffffff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:16px;font-weight:600;text-align:center;text-decoration:none;padding:14px 36px;border-radius:8px">
                      Get Started
                    </a>
                  </td>
                </tr>
                <!-- Sign-off -->
                <tr>
                  <td align="left" class="content-cell" style="padding:0 40px 32px 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      Thank you again for joining us. We look forward to serving you!
                    </p>
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text};padding-top:12px">
                      Best regards,<br>
                      <strong>The ${COMPANY.name} Team</strong>
                    </p>
                  </td>
                </tr>
              </table>`;

  return wrapInLayout(`Welcome to ${COMPANY.name}`, content);
};

// ──────────────────────────────────────────────────────────
// DEPOSIT NOTIFICATION
// ──────────────────────────────────────────────────────────

export const depositNotificationTemplate = (
  firstName: string,
  amount: number,
  balanceAfter: number,
  transactionReference: string,
  accountNumber: string,
  bankName: string,
  transactionDate: string,
  senderName?: string | null,
  senderAccountNumber?: string | null,
  senderBank?: string | null,
): string => {
  const fmt = (v: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(v);

  const formattedAmount = fmt(amount);
  const formattedBalance = fmt(balanceAfter);

  const senderSection =
    senderName && senderAccountNumber && senderBank
      ? `
                                <tr>
                                  <td colspan="2" style="padding:12px 0 0 0;border-top:1px solid ${BRAND.border}">
                                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};padding-bottom:8px">Sender Details</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Sender Name</td>
                                  <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${senderName}</td>
                                </tr>
                                <tr>
                                  <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Sender Account</td>
                                  <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${senderAccountNumber}</td>
                                </tr>
                                <tr>
                                  <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Sender Bank</td>
                                  <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${senderBank}</td>
                                </tr>`
      : '';

  const content = `
              <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <!-- Success accent bar -->
                <tr>
                  <td style="height:4px;background-color:${BRAND.success};font-size:0;line-height:0">&nbsp;</td>
                </tr>
                <!-- Heading -->
                <tr>
                  <td align="center" class="content-cell" style="padding:32px 40px 0 40px">
                    <h1 style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:26px;font-weight:700;line-height:32px;color:${BRAND.success}">
                      Deposit Successful
                    </h1>
                  </td>
                </tr>
                <!-- Greeting -->
                <tr>
                  <td align="left" class="content-cell" style="padding:20px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      Dear <strong>${firstName}</strong>, your deposit has been received and your wallet has been credited.
                    </p>
                  </td>
                </tr>
                <!-- Amount highlight -->
                <tr>
                  <td align="center" style="padding:24px 40px 0 40px">
                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:${BRAND.successBg};border-radius:10px;border:1px solid #bbf7d0">
                      <tr>
                        <td align="center" style="padding:20px">
                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};padding-bottom:4px">Amount Deposited</p>
                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:28px;font-weight:700;color:${BRAND.success};line-height:36px">${formattedAmount}</p>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding:0 20px 20px 20px;border-top:1px solid #bbf7d0">
                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};padding-top:16px;padding-bottom:4px">New Wallet Balance</p>
                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:24px;font-weight:700;color:${BRAND.heading};line-height:32px">${formattedBalance}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Transaction details -->
                <tr>
                  <td align="center" style="padding:16px 40px 0 40px">
                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:${BRAND.bgMuted};border-radius:10px">
                      <tr>
                        <td style="padding:20px">
                          <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                            <tr>
                              <td colspan="2" style="padding-bottom:12px">
                                <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted}">Transaction Details</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Reference</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${transactionReference}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Account Number</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${accountNumber}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Bank</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${bankName}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Date</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${transactionDate}</td>
                            </tr>
                            ${senderSection}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer text -->
                <tr>
                  <td align="left" class="content-cell" style="padding:24px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      Your funds are now available in your wallet and ready to use.
                    </p>
                  </td>
                </tr>
                <!-- Sign-off -->
                <tr>
                  <td align="left" class="content-cell" style="padding:16px 40px 32px 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;line-height:22px;color:${BRAND.muted}">
                      Thank you for choosing ${COMPANY.name}!<br>
                      <strong style="color:${BRAND.heading}">The ${COMPANY.name} Team</strong>
                    </p>
                  </td>
                </tr>
              </table>`;

  return wrapInLayout('Deposit Confirmation', content);
};

// ──────────────────────────────────────────────────────────
// CABLE PURCHASE SUCCESS
// ──────────────────────────────────────────────────────────

export const cablePurchaseSuccessTemplate = (
  firstName: string,
  serviceName: string,
  billersCode: string,
  amount: number,
  transactionReference: string,
  transactionDate: string,
  productName?: string,
): string => {
  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);

  const productRow = productName
    ? `
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Product</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${productName}</td>
                            </tr>`
    : '';

  const content = `
              <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <!-- Success accent bar -->
                <tr>
                  <td style="height:4px;background-color:${BRAND.success};font-size:0;line-height:0">&nbsp;</td>
                </tr>
                <!-- Heading -->
                <tr>
                  <td align="center" class="content-cell" style="padding:32px 40px 0 40px">
                    <h1 style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:24px;font-weight:700;line-height:30px;color:${BRAND.success}">
                      Cable Subscription Successful
                    </h1>
                  </td>
                </tr>
                <!-- Greeting -->
                <tr>
                  <td align="left" class="content-cell" style="padding:20px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      Dear <strong>${firstName}</strong>, your ${serviceName} cable subscription has been successfully purchased and activated.
                    </p>
                  </td>
                </tr>
                <!-- Transaction details -->
                <tr>
                  <td align="center" style="padding:24px 40px 0 40px">
                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:${BRAND.bgMuted};border-radius:10px;border:1px solid ${BRAND.border}">
                      <tr>
                        <td style="padding:20px">
                          <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Service Provider</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${serviceName}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Smartcard Number</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${billersCode}</td>
                            </tr>
                            ${productRow}
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Amount</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;color:${BRAND.success};font-weight:700">${formattedAmount}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Reference</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${transactionReference}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Date</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${transactionDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Note -->
                <tr>
                  <td align="left" class="content-cell" style="padding:24px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      Your subscription is now active. Please allow a few minutes for the service to reflect on your decoder.
                    </p>
                  </td>
                </tr>
                <!-- Sign-off -->
                <tr>
                  <td align="left" class="content-cell" style="padding:16px 40px 32px 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;line-height:22px;color:${BRAND.muted}">
                      Thank you for using ${COMPANY.name}!<br>
                      <strong style="color:${BRAND.heading}">The ${COMPANY.name} Team</strong>
                    </p>
                  </td>
                </tr>
              </table>`;

  return wrapInLayout('Cable Subscription Successful', content);
};
