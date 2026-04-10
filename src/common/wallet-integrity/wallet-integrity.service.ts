import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditActorType, AuditStatus, AuditSeverity } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EmailService } from '../mailer/email.service';
import { roundNgn } from '../money/round-ngn';

export type WalletAnalysisCashbackDto = {
  current_balance: number;
  all_time_earned: number;
  all_time_withdrawn: number;
  expected_balance: number;
  delta: number;
  ok: boolean;
};

export type WalletAnalysisDto = {
  enforcement_skipped: boolean;
  enforcement_skip_reason?: string;
  tolerance_ngn: number;
  main: {
    current_balance: number;
    all_time_funding: number;
    all_time_withdrawn: number;
    expected_balance: number;
    delta: number;
    ok: boolean;
  };
  cashback: WalletAnalysisCashbackDto | null;
};

@Injectable()
export class WalletIntegrityService {
  private readonly logger = new Logger(WalletIntegrityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly emailService: EmailService,
  ) {}

  private isEnabled(): boolean {
    const v = process.env.WALLET_INTEGRITY_ENABLED;
    if (v === undefined || v === '') return false;
    return v === '1' || v.toLowerCase() === 'true';
  }

  private tolerance(): number {
    const t = parseFloat(process.env.WALLET_INTEGRITY_TOLERANCE_NGN || '500');
    return Number.isFinite(t) && t >= 0 ? t : 500;
  }

  private devEmail(): string {
    return process.env.DEV_EMAILS || 'bernardmayowaa@gmail.com';
  }

  async userTouchedByAdminBalanceAdjust(userId: string): Promise<boolean> {
    const w = await this.prisma.auditLog.count({
      where: { action: 'ADMIN_USER_WALLET_ADJUST', resource_id: userId },
    });
    if (w > 0) return true;
    const c = await this.prisma.auditLog.count({
      where: { action: 'ADMIN_USER_CASHBACK_ADJUST', resource_id: userId },
    });
    return c > 0;
  }

  /**
   * Core check: all_time_funding - all_time_withdrawn should equal current_balance.
   * Same logic for cashback wallet.
   */
  async getWalletAnalysis(userId: string): Promise<WalletAnalysisDto> {
    const tol = this.tolerance();
    const adminAdjusted = await this.userTouchedByAdminBalanceAdjust(userId);

    const [wallet, cbWallet] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { user_id: userId } }),
      this.prisma.cashbackWallet.findUnique({ where: { user_id: userId } }),
    ]);

    const currentBal = roundNgn(Number(wallet?.current_balance ?? 0));
    const allTimeFunding = roundNgn(Number(wallet?.all_time_fuunding ?? 0));
    const allTimeWithdrawn = roundNgn(Number(wallet?.all_time_withdrawn ?? 0));
    const expectedBal = roundNgn(allTimeFunding - allTimeWithdrawn);
    const delta = roundNgn(currentBal - expectedBal);
    const mainOk = Math.abs(delta) <= tol;

    let cashbackBlock: WalletAnalysisCashbackDto | null = null;
    if (cbWallet) {
      const cbBal = roundNgn(Number(cbWallet.current_balance));
      const cbEarned = roundNgn(Number(cbWallet.all_time_earned));
      const cbWithdrawn = roundNgn(Number(cbWallet.all_time_withdrawn));
      const cbExpected = roundNgn(cbEarned - cbWithdrawn);
      const cbDelta = roundNgn(cbBal - cbExpected);
      cashbackBlock = {
        current_balance: cbBal,
        all_time_earned: cbEarned,
        all_time_withdrawn: cbWithdrawn,
        expected_balance: cbExpected,
        delta: cbDelta,
        ok: Math.abs(cbDelta) <= tol,
      };
    }

    return {
      enforcement_skipped: adminAdjusted,
      enforcement_skip_reason: adminAdjusted
        ? 'Admin wallet/cashback adjustments on file — auto-suspend skipped.'
        : undefined,
      tolerance_ngn: tol,
      main: {
        current_balance: currentBal,
        all_time_funding: allTimeFunding,
        all_time_withdrawn: allTimeWithdrawn,
        expected_balance: expectedBal,
        delta,
        ok: mainOk,
      },
      cashback: cashbackBlock,
    };
  }

  /**
   * Pre-purchase gate. If funding - withdrawn != balance (beyond tolerance), suspend + email dev.
   */
  async assertWalletIntegrityForPurchase(userId: string): Promise<void> {
    if (!this.isEnabled()) return;

    const analysis = await this.getWalletAnalysis(userId);
    if (analysis.enforcement_skipped) return;

    const mainBad = !analysis.main.ok;
    const cbBad = analysis.cashback && !analysis.cashback.ok;
    if (!mainBad && !cbBad) return;

    const reasons: string[] = [];
    const m = analysis.main;
    if (mainBad) {
      reasons.push(
        `MAIN WALLET: funding(${m.all_time_funding}) - withdrawn(${m.all_time_withdrawn}) = expected(${m.expected_balance}), but actual balance is ${m.current_balance}. Delta: ${m.delta} (tolerance: ±${analysis.tolerance_ngn})`,
      );
    }
    const c = analysis.cashback;
    if (cbBad && c) {
      reasons.push(
        `CASHBACK WALLET: earned(${c.all_time_earned}) - withdrawn(${c.all_time_withdrawn}) = expected(${c.expected_balance}), but actual balance is ${c.current_balance}. Delta: ${c.delta} (tolerance: ±${analysis.tolerance_ngn})`,
      );
    }

    this.logger.error(
      `[WALLET_INTEGRITY_SUSPEND] userId=${userId}\n${reasons.join('\n')}`,
    );

    // Suspend the account
    await this.prisma.user.update({
      where: { id: userId },
      data: { account_status: 'suspended' },
    });

    // Audit log
    await this.auditLogService.log({
      user_id: userId,
      actor_type: AuditActorType.SYSTEM,
      action: AuditAction.WALLET_BALANCE_CHECK,
      status: AuditStatus.FAILURE,
      severity: AuditSeverity.CRITICAL,
      resource_type: 'User',
      resource_id: userId,
      description: `Account suspended: WALLET_LEDGER_MISMATCH`,
      error_message: reasons.join(' | '),
      metadata: { reason: 'WALLET_LEDGER_MISMATCH', failure_reasons: reasons, analysis } as any,
    });

    // Email dev with full details
    this.sendSuspensionEmail(userId, reasons, analysis).catch((e) =>
      this.logger.warn(`Failed to send wallet-integrity email: ${e.message}`),
    );

    throw new ForbiddenException(
      'Your account is temporarily restricted. Please contact support.',
    );
  }

  private async sendSuspensionEmail(
    userId: string,
    reasons: string[],
    analysis: WalletAnalysisDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        smipay_tag: true,
        account_status: true,
        createdAt: true,
      },
    });

    const m = analysis.main;
    const c = analysis.cashback;
    const now = new Date().toISOString();

    const html = `
<h2 style="color:#d32f2f;">Wallet Integrity — Account Suspended</h2>
<p><strong>Triggered at:</strong> ${now}</p>

<h3>User Details</h3>
<table style="border-collapse:collapse;width:100%;max-width:600px;">
  <tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">User ID</td><td style="padding:4px 8px;border:1px solid #ddd;">${userId}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:4px 8px;border:1px solid #ddd;">${user?.first_name ?? ''} ${user?.last_name ?? ''}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:4px 8px;border:1px solid #ddd;">${user?.email ?? 'N/A'}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">Phone</td><td style="padding:4px 8px;border:1px solid #ddd;">${user?.phone_number ?? 'N/A'}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">SmiPay Tag</td><td style="padding:4px 8px;border:1px solid #ddd;">${user?.smipay_tag ?? 'N/A'}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">Registered</td><td style="padding:4px 8px;border:1px solid #ddd;">${user?.createdAt?.toISOString() ?? 'N/A'}</td></tr>
</table>

<h3>Why Suspended</h3>
<ul>
  ${reasons.map((r) => `<li style="margin-bottom:6px;">${r}</li>`).join('')}
</ul>

<h3>Main Wallet Snapshot</h3>
<table style="border-collapse:collapse;width:100%;max-width:600px;">
  <tr><td style="padding:4px 8px;border:1px solid #ddd;">All-Time Funding (deposits + bonuses)</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${m.all_time_funding.toLocaleString()}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;">All-Time Withdrawn (spent)</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${m.all_time_withdrawn.toLocaleString()}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;">Expected Balance (funding - withdrawn)</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${m.expected_balance.toLocaleString()}</td></tr>
  <tr style="background:${m.ok ? '#e8f5e9' : '#ffebee'}"><td style="padding:4px 8px;border:1px solid #ddd;">Actual Current Balance</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${m.current_balance.toLocaleString()}</td></tr>
  <tr style="background:${m.ok ? '#e8f5e9' : '#ffebee'}"><td style="padding:4px 8px;border:1px solid #ddd;">Delta (actual - expected)</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${m.delta.toLocaleString()}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;">Tolerance</td><td style="padding:4px 8px;border:1px solid #ddd;">±₦${analysis.tolerance_ngn}</td></tr>
</table>

${c ? `
<h3>Cashback Wallet Snapshot</h3>
<table style="border-collapse:collapse;width:100%;max-width:600px;">
  <tr><td style="padding:4px 8px;border:1px solid #ddd;">All-Time Earned</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${c.all_time_earned.toLocaleString()}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;">All-Time Withdrawn (used)</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${c.all_time_withdrawn.toLocaleString()}</td></tr>
  <tr><td style="padding:4px 8px;border:1px solid #ddd;">Expected Balance (earned - withdrawn)</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${c.expected_balance.toLocaleString()}</td></tr>
  <tr style="background:${c.ok ? '#e8f5e9' : '#ffebee'}"><td style="padding:4px 8px;border:1px solid #ddd;">Actual Current Balance</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${c.current_balance.toLocaleString()}</td></tr>
  <tr style="background:${c.ok ? '#e8f5e9' : '#ffebee'}"><td style="padding:4px 8px;border:1px solid #ddd;">Delta (actual - expected)</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:bold;">₦${c.delta.toLocaleString()}</td></tr>
</table>
` : '<p><em>No cashback wallet found for this user.</em></p>'}

<hr style="margin:24px 0;"/>
<p style="color:#666;font-size:12px;">This is an automated alert from the SmiPay Wallet Integrity system. The user's account has been suspended and they cannot make purchases until manually reviewed.</p>
`;

    await this.emailService.sendEmail(
      this.devEmail(),
      `🚨 WALLET INTEGRITY ALERT — ${user?.first_name ?? ''} ${user?.last_name ?? ''} (${user?.email ?? userId})`,
      html,
    );
  }
}
