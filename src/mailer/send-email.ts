import * as nodemailer from 'nodemailer';
import { SentMessageInfo } from 'nodemailer';
import { otpVerificationCodeTemplate } from './email.template';

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
                name: "PayFlex LTD",
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