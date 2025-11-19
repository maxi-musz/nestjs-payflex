/**
 * Email Provider Interface
 * All email providers must implement this interface
 */
export interface IEmailProvider {
  /**
   * Send email
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param htmlContent - HTML content of the email
   * @param fromName - Sender name (optional)
   * @param fromEmail - Sender email (optional, defaults to configured email)
   * @returns Promise<void>
   */
  sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    fromName?: string,
    fromEmail?: string,
  ): Promise<void>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}

