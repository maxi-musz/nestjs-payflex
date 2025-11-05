import * as nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';
import { otpVerificationCodeTemplate, depositNotificationTemplate, cablePurchaseSuccessTemplate } from './email.template';

export const sendOTPByEmail = async (email: string, otp: string): Promise<void> => {
    try {

        // Check if env vars exist (optional but recommended)
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            throw new Error("SMTP credentials missing in environment variables");
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: process.env.GOOGLE_SMTP_HOST,
            port: process.env.GOOGLE_SMTP_PORT ? parseInt(process.env.GOOGLE_SMTP_PORT) : 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const otpExpiresAt = "5 minutes";
        const htmlContent = otpVerificationCodeTemplate(email, otp, otpExpiresAt);

        const mailOptions = {
            from: {
                name: "SmiPay MFB",
                address: process.env.EMAIL_USER as string,
            },
            to: email,
            subject: `Login OTP Confirmation Code: ${otp}`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending otp email:', error);
        throw new Error('Failed to send OTP email');
    }
};

/**
 * Send deposit notification email to user
 */
export const sendDepositNotificationEmail = async (
    email: string,
    firstName: string,
    amount: number,
    balanceAfter: number,
    transactionReference: string,
    accountNumber: string,
    bankName: string,
    transactionDate: string,
    senderName?: string | null,
    senderAccountNumber?: string | null,
    senderBank?: string | null
): Promise<void> => {
    try {
        // Check if env vars exist
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('SMTP credentials missing. Skipping deposit notification email.');
            return;
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: process.env.GOOGLE_SMTP_HOST,
            port: process.env.GOOGLE_SMTP_PORT ? parseInt(process.env.GOOGLE_SMTP_PORT) : 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const htmlContent = depositNotificationTemplate(
            firstName,
            amount,
            balanceAfter,
            transactionReference,
            accountNumber,
            bankName,
            transactionDate,
            senderName,
            senderAccountNumber,
            senderBank
        );

        const mailOptions = {
            from: {
                name: "SmiPay MFB",
                address: process.env.EMAIL_USER as string,
            },
            to: email,
            subject: `✅ Deposit Successful - ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount)}`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`Deposit notification email sent successfully to ${email}`);
    } catch (error) {
        console.error('Error sending deposit notification email:', error);
        // Don't throw error - email failure shouldn't break webhook processing
        // Just log it for monitoring
    }
};

/**
 * Send cable purchase success notification email to user
 */
export const sendCablePurchaseSuccessEmail = async (
    email: string,
    firstName: string,
    serviceName: string,
    billersCode: string,
    amount: number,
    transactionReference: string,
    transactionDate: string,
    productName?: string
): Promise<void> => {
    try {
        // Check if env vars exist
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('SMTP credentials missing. Skipping cable purchase notification email.');
            return;
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: process.env.GOOGLE_SMTP_HOST,
            port: process.env.GOOGLE_SMTP_PORT ? parseInt(process.env.GOOGLE_SMTP_PORT) : 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const htmlContent = cablePurchaseSuccessTemplate(
            firstName,
            serviceName,
            billersCode,
            amount,
            transactionReference,
            transactionDate,
            productName
        );

        const mailOptions = {
            from: {
                name: "SmiPay MFB",
                address: process.env.EMAIL_USER as string,
            },
            to: email,
            subject: `✅ ${serviceName} Subscription Successful - ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount)}`,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`Cable purchase success email sent successfully to ${email}`);
    } catch (error) {
        console.error('Error sending cable purchase success email:', error);
        // Don't throw error - email failure shouldn't break transaction processing
        // Just log it for monitoring
    }
};