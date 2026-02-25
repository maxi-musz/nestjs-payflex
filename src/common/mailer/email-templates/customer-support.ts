/**
 * Customer Support Email Templates
 * Contains all email templates related to support tickets and customer service
 */

import { BRAND, COMPANY } from '../email-brand';
import { wrapInLayout } from '../email-layout';

// SUPPORT TICKET CONFIRMATION EMAIL
export const supportTicketConfirmationTemplate = (
  email: string,
  ticketNumber: string,
  subject: string,
  description: string,
  createdAt: string,
): string => {
  const content = `
              <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <!-- Orange accent bar -->
                <tr>
                  <td style="height:4px;background-color:${BRAND.primary};font-size:0;line-height:0">&nbsp;</td>
                </tr>
                <!-- Heading -->
                <tr>
                  <td align="center" class="content-cell" style="padding:32px 40px 0 40px">
                    <h1 style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:26px;font-weight:700;line-height:32px;color:${BRAND.heading}">
                      Support Ticket Created
                    </h1>
                  </td>
                </tr>
                <!-- Greeting -->
                <tr>
                  <td align="left" class="content-cell" style="padding:20px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      Hello,
                    </p>
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text};padding-top:12px">
                      Thank you for contacting ${COMPANY.name} support. We have received your request and created a support ticket for you.
                    </p>
                  </td>
                </tr>
                <!-- Ticket details card -->
                <tr>
                  <td align="center" style="padding:24px 40px 0 40px">
                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:${BRAND.bgMuted};border-radius:10px;border:1px solid ${BRAND.border}">
                      <tr>
                        <td style="padding:20px">
                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};padding-bottom:4px">Ticket Number</p>
                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:20px;font-weight:700;color:${BRAND.primary};line-height:28px;padding-bottom:16px">${ticketNumber}</p>

                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};padding-bottom:4px">Subject</p>
                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;color:${BRAND.heading};line-height:22px;padding-bottom:16px">${subject}</p>

                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};padding-bottom:4px">Description</p>
                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;color:${BRAND.heading};line-height:22px;padding-bottom:16px">${description}</p>

                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${BRAND.muted};padding-bottom:4px">Created At</p>
                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;color:${BRAND.heading};line-height:22px">${createdAt}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Next steps -->
                <tr>
                  <td align="left" class="content-cell" style="padding:24px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      Our support team will review your ticket and respond as soon as possible. You will receive an email notification when we update your ticket.
                    </p>
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text};padding-top:12px">
                      Please keep your ticket number (<strong>${ticketNumber}</strong>) for reference.
                    </p>
                  </td>
                </tr>
                <!-- Sign-off -->
                <tr>
                  <td align="left" class="content-cell" style="padding:24px 40px 32px 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;line-height:22px;color:${BRAND.muted}">
                      Best regards,<br>
                      <strong style="color:${BRAND.heading}">${COMPANY.name} Support Team</strong>
                    </p>
                  </td>
                </tr>
              </table>`;

  return wrapInLayout('Support Ticket Created', content);
};

// SUPPORT TICKET UPDATE EMAIL (when new enquiry is added to existing ticket)
export const supportTicketUpdateTemplate = (
  email: string,
  ticketNumber: string,
  subject: string,
  messages: Array<{
    id: string;
    message: string;
    is_from_user: boolean;
    sender_email: string | null;
    sender_name: string | null;
    created_at: Date;
    attachments: any;
  }>,
  totalMessages: number,
  latestMessageDate: string,
): string => {
  const formatMessageDate = (date: Date) => {
    return new Date(date).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Lagos',
    });
  };

  const messagesHtml = messages
    .map((msg, index) => {
      const messageDate = formatMessageDate(msg.created_at);
      const isLatest = index === messages.length - 1;

      return `
                                <tr>
                                  <td style="padding:${index === 0 ? '0' : '12px'} 0 0 0">
                                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:${isLatest ? '#fff7ed' : BRAND.bgMuted};border-radius:8px;border-left:3px solid ${isLatest ? BRAND.primary : BRAND.border}">
                                      <tr>
                                        <td style="padding:14px 16px">
                                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;color:${isLatest ? BRAND.primary : BRAND.muted};padding-bottom:6px">
                                            ${isLatest ? 'Latest Enquiry' : `Enquiry #${index + 1}`}${msg.sender_name ? ` &mdash; ${msg.sender_name}` : ''}
                                          </p>
                                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;line-height:22px;color:${BRAND.heading};white-space:pre-wrap">${msg.message}</p>
                                          <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:11px;color:${BRAND.muted};padding-top:8px;border-top:1px solid ${BRAND.border};margin-top:8px">${messageDate}</p>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>`;
    })
    .join('');

  const showingAll = messages.length === totalMessages;
  const moreText = showingAll
    ? ''
    : `<tr><td style="padding:12px 0 0 0"><p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted};font-style:italic">Showing ${messages.length} of ${totalMessages} enquiries. ${totalMessages - messages.length} earlier ${totalMessages - messages.length === 1 ? 'enquiry is' : 'enquiries are'} available in your ticket.</p></td></tr>`;

  const content = `
              <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                <!-- Orange accent bar -->
                <tr>
                  <td style="height:4px;background-color:${BRAND.primary};font-size:0;line-height:0">&nbsp;</td>
                </tr>
                <!-- Heading -->
                <tr>
                  <td align="center" class="content-cell" style="padding:32px 40px 0 40px">
                    <h1 style="margin:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:26px;font-weight:700;line-height:32px;color:${BRAND.heading}">
                      New Enquiry Added
                    </h1>
                  </td>
                </tr>
                <!-- Greeting -->
                <tr>
                  <td align="left" class="content-cell" style="padding:20px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      Hello,
                    </p>
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text};padding-top:12px">
                      A new enquiry has been added to your support ticket. Below is a summary of all your enquiries for this ticket.
                    </p>
                  </td>
                </tr>
                <!-- Ticket info card -->
                <tr>
                  <td align="center" style="padding:24px 40px 0 40px">
                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="background-color:${BRAND.bgMuted};border-radius:10px;border:1px solid ${BRAND.border}">
                      <tr>
                        <td style="padding:20px">
                          <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Ticket Number</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;color:${BRAND.primary};font-weight:700">${ticketNumber}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Subject</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${subject}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Total Enquiries</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${totalMessages} ${totalMessages === 1 ? 'enquiry' : 'enquiries'}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.muted}">Latest Update</td>
                              <td align="right" style="padding:4px 0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:13px;color:${BRAND.heading};font-weight:600">${latestMessageDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Enquiries section -->
                <tr>
                  <td align="left" class="content-cell" style="padding:24px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:16px;font-weight:700;color:${BRAND.heading};padding-bottom:12px">Your Enquiries:</p>
                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation">
                      ${messagesHtml}
                      ${moreText}
                    </table>
                  </td>
                </tr>
                <!-- Next steps -->
                <tr>
                  <td align="left" class="content-cell" style="padding:24px 40px 0 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text}">
                      Our support team will review your latest enquiry and respond as soon as possible. You will receive an email notification when we update your ticket.
                    </p>
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;line-height:24px;color:${BRAND.text};padding-top:12px">
                      Please keep your ticket number (<strong>${ticketNumber}</strong>) for reference.
                    </p>
                  </td>
                </tr>
                <!-- Sign-off -->
                <tr>
                  <td align="left" class="content-cell" style="padding:24px 40px 32px 40px">
                    <p style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:14px;line-height:22px;color:${BRAND.muted}">
                      Best regards,<br>
                      <strong style="color:${BRAND.heading}">${COMPANY.name} Support Team</strong>
                    </p>
                  </td>
                </tr>
              </table>`;

  return wrapInLayout('Support Ticket Update', content);
};
