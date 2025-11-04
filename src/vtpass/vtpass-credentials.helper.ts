import { ConfigService } from '@nestjs/config';

export interface VtpassCredentials {
  apiKey: string;
  publicKey: string;
  secretKey: string;
  isDevelopment: boolean;
  baseUrl: string;
}

export class VtpassCredentialsHelper {
  static getCredentials(configService: ConfigService): VtpassCredentials {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const vtpassSandboxBaseUrl = process.env.VT_PASS_SANDBOX_API_URL || '';
    const vtpassLiveBaseUrl = process.env.VT_PASS_LIVE_API_URL || '';

    // Prefer env-specific keys; fall back to generic
    // Support both prefixes: VTPASS_* and VT_PASS_*
    const sandboxApiKey =
      configService.get<string>('VT_PASS_SANDBOX_API_KEY') ||
      process.env.VT_PASS_SANDBOX_API_KEY ||
      configService.get<string>('VTPASS_SANDBOX_API_KEY') ||
      process.env.VTPASS_SANDBOX_API_KEY || '';
    const sandboxPublicKey =
      configService.get<string>('VT_PASS_SANDBOX_PUBLIC_KEY') ||
      process.env.VT_PASS_SANDBOX_PUBLIC_KEY ||
      configService.get<string>('VTPASS_SANDBOX_PUBLIC_KEY') ||
      process.env.VTPASS_SANDBOX_PUBLIC_KEY || '';
    const sandboxSecretKey =
      configService.get<string>('VT_PASS_SANDBOX_SECRET_KEY') ||
      process.env.VT_PASS_SANDBOX_SECRET_KEY ||
      configService.get<string>('VTPASS_SANDBOX_SECRET_KEY') ||
      process.env.VTPASS_SANDBOX_SECRET_KEY || '';

    const liveApiKey =
      configService.get<string>('VT_PASS_LIVE_API_KEY') ||
      process.env.VT_PASS_LIVE_API_KEY ||
      configService.get<string>('VTPASS_LIVE_API_KEY') ||
      process.env.VTPASS_LIVE_API_KEY || '';
    const livePublicKey =
      configService.get<string>('VT_PASS_LIVE_PUBLIC_KEY') ||
      process.env.VT_PASS_LIVE_PUBLIC_KEY ||
      configService.get<string>('VTPASS_LIVE_PUBLIC_KEY') ||
      process.env.VTPASS_LIVE_PUBLIC_KEY || '';
    const liveSecretKey =
      configService.get<string>('VT_PASS_LIVE_SECRET_KEY') ||
      process.env.VT_PASS_LIVE_SECRET_KEY ||
      configService.get<string>('VTPASS_LIVE_SECRET_KEY') ||
      process.env.VTPASS_LIVE_SECRET_KEY || '';

    const genericApiKey =
      configService.get<string>('VT_PASS_API_KEY') ||
      process.env.VT_PASS_API_KEY ||
      configService.get<string>('VTPASS_API_KEY') ||
      process.env.VTPASS_API_KEY || '';
    const genericPublicKey =
      configService.get<string>('VT_PASS_PUBLIC_KEY') ||
      process.env.VT_PASS_PUBLIC_KEY ||
      configService.get<string>('VTPASS_PUBLIC_KEY') ||
      process.env.VTPASS_PUBLIC_KEY || '';
    const genericSecretKey =
      configService.get<string>('VT_PASS_SECRET_KEY') ||
      process.env.VT_PASS_SECRET_KEY ||
      configService.get<string>('VTPASS_SECRET_KEY') ||
      process.env.VTPASS_SECRET_KEY || '';

    let apiKey: string;
    let publicKey: string;
    let secretKey: string;

    if (isDevelopment) {
      apiKey = sandboxApiKey || genericApiKey;
      publicKey = sandboxPublicKey || genericPublicKey;
      secretKey = sandboxSecretKey || genericSecretKey;
    } else {
      apiKey = liveApiKey || genericApiKey;
      publicKey = livePublicKey || genericPublicKey;
      secretKey = liveSecretKey || genericSecretKey;
    }

    const baseUrl = isDevelopment ? vtpassSandboxBaseUrl : vtpassLiveBaseUrl;

    return {
      apiKey,
      publicKey,
      secretKey,
      isDevelopment,
      baseUrl,
    };
  }
}

