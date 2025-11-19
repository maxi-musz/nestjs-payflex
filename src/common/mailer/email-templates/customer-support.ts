/**
 * Customer Support Email Templates
 * Contains all email templates related to support tickets and customer service
 */

// SUPPORT TICKET CONFIRMATION EMAIL
export const supportTicketConfirmationTemplate = (
  email: string,
  ticketNumber: string,
  subject: string,
  description: string,
  createdAt: string,
): string => {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta content="telephone=no" name="format-detection">
  <title>Support Ticket Created</title>
  <style type="text/css">
    @media only screen and (max-width:600px) {
      .es-m-p0r { padding-right:0px!important }
      .es-m-p0l { padding-left:0px!important }
      *[class="gmail-fix"] { display:none!important }
      p, a { line-height:150%!important }
      h1, h1 a { line-height:120%!important }
      h2, h2 a { line-height:120%!important }
      h3, h3 a { line-height:120%!important }
      .es-header-body p { }
      .es-content-body p { }
      .es-footer-body p { }
      h1 { font-size:24px!important; text-align:center!important }
      h2 { font-size:20px!important; text-align:left }
      h3 { font-size:18px!important; text-align:left }
    }
  </style>
</head>
<body class="body" style="width:100%;height:100%;padding:0;Margin:0;background-color:#f4f4f4">
  <table width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#f4f4f4">
    <tr>
      <td valign="top" style="padding:0;Margin:0">
        <table cellpadding="0" cellspacing="0" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:100%;table-layout:fixed !important;background-color:transparent;background-repeat:repeat;background-position:center top">
          <tr>
            <td align="center" style="padding:0;Margin:0">
              <table bgcolor="#ffffff" align="center" cellpadding="0" cellspacing="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px;margin:20px auto">
                <tr>
                  <td align="left" style="padding:30px;Margin:0">
                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                      <tr>
                        <td align="center" style="padding:0;Margin:0;padding-bottom:20px">
                          <h1 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#333333;text-align:center">
                            Support Ticket Created
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:20px">
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:16px;color:#333333">
                            Hello,
                          </p>
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:16px;color:#333333;padding-top:15px">
                            Thank you for contacting SmiPay support. We have received your request and created a support ticket for you.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:30px">
                          <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#f8f9fa;border-radius:8px;padding:20px">
                            <tr>
                              <td style="padding:0;Margin:0">
                                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666;padding-bottom:10px">
                                  <strong style="color:#333333">Ticket Number:</strong><br>
                                  <span style="font-size:18px;color:#FF6E12;font-weight:bold">${ticketNumber}</span>
                                </p>
                                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666;padding-top:15px;padding-bottom:10px">
                                  <strong style="color:#333333">Subject:</strong><br>
                                  ${subject}
                                </p>
                                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666;padding-top:15px;padding-bottom:10px">
                                  <strong style="color:#333333">Description:</strong><br>
                                  ${description}
                                </p>
                                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666;padding-top:15px">
                                  <strong style="color:#333333">Created At:</strong><br>
                                  ${createdAt}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:30px">
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:16px;color:#333333">
                            Our support team will review your ticket and respond as soon as possible. You will receive an email notification when we update your ticket.
                          </p>
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:16px;color:#333333;padding-top:15px">
                            Please keep your ticket number (<strong>${ticketNumber}</strong>) for reference.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:30px">
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:16px;color:#333333">
                            If you have any additional information or questions, please reply to this email or contact our support team directly.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:30px">
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666">
                            Best regards,<br>
                            <strong style="color:#333333">SmiPay Support Team</strong>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
  // Format message dates
  const formatMessageDate = (date: Date) => {
    return new Date(date).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Lagos',
    });
  };

  // Build messages HTML
  const messagesHtml = messages.map((msg, index) => {
    const messageDate = formatMessageDate(msg.created_at);
    const isLatest = index === messages.length - 1;
    
    return `
      <tr>
        <td align="left" style="padding:0;Margin:0;padding-top:${index === 0 ? '0' : '20px'}">
          <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:${isLatest ? '#fff3e0' : '#f8f9fa'};border-radius:8px;padding:15px;border-left:${isLatest ? '4px solid #FF6E12' : '4px solid #e0e0e0'}">
            <tr>
              <td style="padding:0;Margin:0">
                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:12px;color:#666666;padding-bottom:8px">
                  <strong style="color:#333333">${isLatest ? '🆕 Latest Enquiry' : `Enquiry #${index + 1}`}</strong>
                  ${msg.sender_name ? ` - ${msg.sender_name}` : ''}
                </p>
                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#333333;padding-bottom:10px;white-space:pre-wrap">
                  ${msg.message}
                </p>
                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:11px;color:#999999;padding-top:8px;border-top:1px solid #e0e0e0">
                  ${messageDate}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const showingAll = messages.length === totalMessages;
  const moreMessagesText = showingAll 
    ? '' 
    : `<p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666;padding-top:15px;font-style:italic">
      Showing ${messages.length} of ${totalMessages} enquiries. ${totalMessages - messages.length} earlier ${totalMessages - messages.length === 1 ? 'enquiry' : 'enquiries'} ${totalMessages - messages.length === 1 ? 'is' : 'are'} available in your ticket.
    </p>`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta content="telephone=no" name="format-detection">
  <title>Support Ticket Update</title>
  <style type="text/css">
    @media only screen and (max-width:600px) {
      .es-m-p0r { padding-right:0px!important }
      .es-m-p0l { padding-left:0px!important }
      *[class="gmail-fix"] { display:none!important }
      p, a { line-height:150%!important }
      h1, h1 a { line-height:120%!important }
      h2, h2 a { line-height:120%!important }
      h3, h3 a { line-height:120%!important }
      .es-header-body p { }
      .es-content-body p { }
      .es-footer-body p { }
      h1 { font-size:24px!important; text-align:center!important }
      h2 { font-size:20px!important; text-align:left }
      h3 { font-size:18px!important; text-align:left }
    }
  </style>
</head>
<body class="body" style="width:100%;height:100%;padding:0;Margin:0;background-color:#f4f4f4">
  <table width="100%" cellspacing="0" cellpadding="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top;background-color:#f4f4f4">
    <tr>
      <td valign="top" style="padding:0;Margin:0">
        <table cellpadding="0" cellspacing="0" align="center" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:100%;table-layout:fixed !important;background-color:transparent;background-repeat:repeat;background-position:center top">
          <tr>
            <td align="center" style="padding:0;Margin:0">
              <table bgcolor="#ffffff" align="center" cellpadding="0" cellspacing="0" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px;margin:20px auto">
                <tr>
                  <td align="left" style="padding:30px;Margin:0">
                    <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                      <tr>
                        <td align="center" style="padding:0;Margin:0;padding-bottom:20px">
                          <h1 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:28px;font-style:normal;font-weight:bold;color:#333333;text-align:center">
                            New Enquiry Added
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:20px">
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:16px;color:#333333">
                            Hello,
                          </p>
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:16px;color:#333333;padding-top:15px">
                            A new enquiry has been added to your support ticket. Below is a summary of all your enquiries for this ticket.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:30px">
                          <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#f8f9fa;border-radius:8px;padding:20px">
                            <tr>
                              <td style="padding:0;Margin:0">
                                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666;padding-bottom:10px">
                                  <strong style="color:#333333">Ticket Number:</strong><br>
                                  <span style="font-size:18px;color:#FF6E12;font-weight:bold">${ticketNumber}</span>
                                </p>
                                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666;padding-top:15px;padding-bottom:10px">
                                  <strong style="color:#333333">Subject:</strong><br>
                                  ${subject}
                                </p>
                                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666;padding-top:15px;padding-bottom:10px">
                                  <strong style="color:#333333">Total Enquiries:</strong><br>
                                  ${totalMessages} ${totalMessages === 1 ? 'enquiry' : 'enquiries'}
                                </p>
                                <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666;padding-top:15px">
                                  <strong style="color:#333333">Latest Update:</strong><br>
                                  ${latestMessageDate}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:30px">
                          <h2 style="Margin:0;line-height:120%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:20px;font-style:normal;font-weight:bold;color:#333333;padding-bottom:15px">
                            Your Enquiries:
                          </h2>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:10px">
                          <table cellpadding="0" cellspacing="0" width="100%" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px">
                            ${messagesHtml}
                          </table>
                        </td>
                      </tr>
                      ${moreMessagesText ? `
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:20px">
                          ${moreMessagesText}
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:30px">
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:16px;color:#333333">
                            Our support team will review your latest enquiry and respond as soon as possible. You will receive an email notification when we update your ticket.
                          </p>
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:16px;color:#333333;padding-top:15px">
                            Please keep your ticket number (<strong>${ticketNumber}</strong>) for reference.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td align="left" style="padding:0;Margin:0;padding-top:30px">
                          <p style="Margin:0;line-height:150%;mso-line-height-rule:exactly;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;font-size:14px;color:#666666">
                            Best regards,<br>
                            <strong style="color:#333333">SmiPay Support Team</strong>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

