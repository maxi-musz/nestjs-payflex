import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client';

/**
 * Maps every AuditAction to its AuditCategory.
 * This allows callers to only specify the action — the category is inferred automatically.
 */
export const ACTION_CATEGORY_MAP: Record<AuditAction, AuditCategory> = {
  // Authentication
  LOGIN: AuditCategory.AUTHENTICATION,
  LOGIN_FAILED: AuditCategory.AUTHENTICATION,
  LOGOUT: AuditCategory.AUTHENTICATION,
  SESSION_REFRESH: AuditCategory.AUTHENTICATION,
  TOKEN_REFRESH: AuditCategory.AUTHENTICATION,
  PASSWORD_VERIFY: AuditCategory.AUTHENTICATION,
  PASSWORD_VERIFY_FAILED: AuditCategory.AUTHENTICATION,
  LOGIN_STATUS_CHECK: AuditCategory.AUTHENTICATION,

  // Registration
  REGISTER_START: AuditCategory.REGISTRATION,
  REGISTER_RESEND_OTP: AuditCategory.REGISTRATION,
  REGISTER_VERIFY_OTP: AuditCategory.REGISTRATION,
  REGISTER_SUBMIT_ID: AuditCategory.REGISTRATION,
  REGISTER_SUBMIT_ADDRESS: AuditCategory.REGISTRATION,
  REGISTER_SUBMIT_PEP: AuditCategory.REGISTRATION,
  REGISTER_SUBMIT_INCOME: AuditCategory.REGISTRATION,
  REGISTER_SETUP_PASSWORD: AuditCategory.REGISTRATION,
  REGISTER_COMPLETE: AuditCategory.REGISTRATION,
  MINIMAL_REGISTER: AuditCategory.REGISTRATION,
  MINIMAL_LOGIN: AuditCategory.AUTHENTICATION,

  // Email & OTP
  EMAIL_OTP_REQUEST: AuditCategory.AUTHENTICATION,
  EMAIL_OTP_VERIFY: AuditCategory.AUTHENTICATION,
  PASSWORD_RESET_REQUEST: AuditCategory.AUTHENTICATION,
  PASSWORD_RESET_VERIFY: AuditCategory.AUTHENTICATION,
  PASSWORD_RESET_COMPLETE: AuditCategory.AUTHENTICATION,

  // User Management
  PROFILE_VIEW: AuditCategory.USER_MANAGEMENT,
  PROFILE_UPDATE: AuditCategory.USER_MANAGEMENT,
  KYC_VIEW: AuditCategory.KYC_VERIFICATION,
  KYC_UPDATE: AuditCategory.KYC_VERIFICATION,
  TRANSACTION_PIN_SETUP: AuditCategory.USER_MANAGEMENT,
  TRANSACTION_PIN_UPDATE: AuditCategory.USER_MANAGEMENT,
  DASHBOARD_VIEW: AuditCategory.USER_MANAGEMENT,
  HOMEPAGE_VIEW: AuditCategory.USER_MANAGEMENT,

  // Banking
  FUND_WALLET_INIT: AuditCategory.BANKING,
  FUND_WALLET_VERIFY: AuditCategory.BANKING,
  FUND_WALLET_COMPLETE: AuditCategory.BANKING,
  VIRTUAL_ACCOUNT_CREATE: AuditCategory.BANKING,
  ACCOUNT_NUMBER_VERIFY: AuditCategory.BANKING,
  BANK_LIST_FETCH: AuditCategory.BANKING,
  DVA_CREATE: AuditCategory.BANKING,
  DVA_DEACTIVATE: AuditCategory.BANKING,
  DVA_VIEW: AuditCategory.BANKING,
  DVA_LIST: AuditCategory.BANKING,

  // Transfers
  TRANSFER_INITIATE: AuditCategory.TRANSFER,
  TRANSFER_COMPLETE: AuditCategory.TRANSFER,
  TRANSFER_FAILED: AuditCategory.TRANSFER,
  SMIPAY_TAG_LOOKUP: AuditCategory.TRANSFER,
  SMIPAY_TAG_TRANSFER: AuditCategory.TRANSFER,
  PAYSTACK_TRANSFER_INITIATE: AuditCategory.TRANSFER,
  PAYSTACK_TRANSFER_COMPLETE: AuditCategory.TRANSFER,
  PAYSTACK_TRANSFER_FAILED: AuditCategory.TRANSFER,

  // Wallet
  WALLET_CREDIT: AuditCategory.WALLET,
  WALLET_DEBIT: AuditCategory.WALLET,
  WALLET_BALANCE_CHECK: AuditCategory.WALLET,

  // Airtime
  AIRTIME_PURCHASE: AuditCategory.AIRTIME,
  AIRTIME_PURCHASE_FAILED: AuditCategory.AIRTIME,
  AIRTIME_PROVIDERS_FETCH: AuditCategory.AIRTIME,

  // Data
  DATA_PURCHASE: AuditCategory.DATA,
  DATA_PURCHASE_FAILED: AuditCategory.DATA,
  DATA_PLANS_FETCH: AuditCategory.DATA,
  DATA_PROVIDERS_FETCH: AuditCategory.DATA,

  // Cable
  CABLE_SMARTCARD_VERIFY: AuditCategory.CABLE,
  CABLE_PURCHASE: AuditCategory.CABLE,
  CABLE_PURCHASE_FAILED: AuditCategory.CABLE,
  CABLE_PROVIDERS_FETCH: AuditCategory.CABLE,
  CABLE_PLANS_FETCH: AuditCategory.CABLE,

  // Education
  EDUCATION_PURCHASE: AuditCategory.EDUCATION,
  EDUCATION_PURCHASE_FAILED: AuditCategory.EDUCATION,

  // Electricity
  ELECTRICITY_METER_VERIFY: AuditCategory.ELECTRICITY,
  ELECTRICITY_PURCHASE: AuditCategory.ELECTRICITY,
  ELECTRICITY_PURCHASE_FAILED: AuditCategory.ELECTRICITY,

  // Insurance
  INSURANCE_PURCHASE: AuditCategory.INSURANCE,
  INSURANCE_PURCHASE_FAILED: AuditCategory.INSURANCE,

  // Betting
  BETTING_VALIDATE: AuditCategory.BETTING,
  BETTING_FUND: AuditCategory.BETTING,

  // Cards
  CARD_CREATE: AuditCategory.CARD_MANAGEMENT,
  CARD_LIST: AuditCategory.CARD_MANAGEMENT,
  CARD_FUND: AuditCategory.CARD_MANAGEMENT,
  CARD_FREEZE: AuditCategory.CARD_MANAGEMENT,
  CARD_UNFREEZE: AuditCategory.CARD_MANAGEMENT,
  CARD_TERMINATE: AuditCategory.CARD_MANAGEMENT,

  // KYC / Identity
  BVN_VERIFY: AuditCategory.KYC_VERIFICATION,
  BVN_VERIFY_FAILED: AuditCategory.KYC_VERIFICATION,
  NIN_VERIFY: AuditCategory.KYC_VERIFICATION,
  NIN_VERIFY_FAILED: AuditCategory.KYC_VERIFICATION,
  ID_VERIFY: AuditCategory.KYC_VERIFICATION,
  ID_VERIFY_FAILED: AuditCategory.KYC_VERIFICATION,

  // Support
  SUPPORT_TICKET_CREATE: AuditCategory.SUPPORT,
  SUPPORT_TICKET_VIEW: AuditCategory.SUPPORT,
  SUPPORT_TICKET_UPDATE: AuditCategory.SUPPORT,
  SUPPORT_MESSAGE_ADD: AuditCategory.SUPPORT,

  // Push Notifications
  DEVICE_TOKEN_REGISTER: AuditCategory.NOTIFICATION,
  DEVICE_TOKEN_REMOVE: AuditCategory.NOTIFICATION,
  NOTIFICATION_SEND: AuditCategory.NOTIFICATION,

  // Admin
  TIER_CREATE: AuditCategory.ADMIN,
  TIER_UPDATE: AuditCategory.ADMIN,
  TIER_LIST: AuditCategory.ADMIN,
  USER_SUSPEND: AuditCategory.ADMIN,
  USER_ACTIVATE: AuditCategory.ADMIN,
  USER_ROLE_CHANGE: AuditCategory.ADMIN,
  USER_TIER_CHANGE: AuditCategory.ADMIN,
  USER_VIEW: AuditCategory.ADMIN,
  ADMIN_LOGIN: AuditCategory.ADMIN,
  AUDIT_LOG_VIEW: AuditCategory.ADMIN,
  AUDIT_LOG_FLAG: AuditCategory.ADMIN,
  AUDIT_LOG_REVIEW: AuditCategory.ADMIN,

  // Referrals
  REFERRAL_CONFIG_UPDATE: AuditCategory.ADMIN,
  REFERRAL_MANUAL_APPROVE: AuditCategory.ADMIN,
  REFERRAL_MANUAL_REJECT: AuditCategory.ADMIN,

  // Cashback
  CASHBACK_CONFIG_UPDATE: AuditCategory.ADMIN,
  CASHBACK_RULE_CREATE: AuditCategory.ADMIN,
  CASHBACK_RULE_UPDATE: AuditCategory.ADMIN,
  CASHBACK_RULE_DELETE: AuditCategory.ADMIN,

  // Webhooks
  WEBHOOK_PAYSTACK: AuditCategory.WEBHOOK,
  WEBHOOK_FLUTTERWAVE: AuditCategory.WEBHOOK,
  WEBHOOK_VTPASS: AuditCategory.WEBHOOK,

  // System
  CRON_TRANSACTION_REQUERY: AuditCategory.SYSTEM,
  CRON_KEEPALIVE: AuditCategory.SYSTEM,
  SYSTEM_ERROR: AuditCategory.SYSTEM,
  RATE_LIMIT_EXCEEDED: AuditCategory.SYSTEM,

  // Transaction History
  TRANSACTION_HISTORY_VIEW: AuditCategory.TRANSACTION_HISTORY,
  TRANSACTION_DETAIL_VIEW: AuditCategory.TRANSACTION_HISTORY,
};

/**
 * Default severity for actions that carry elevated risk.
 * Actions not listed here default to LOW.
 */
export const ACTION_SEVERITY_MAP: Partial<Record<AuditAction, AuditSeverity>> = {
  // CRITICAL - Immediate attention, potential fraud or major security event
  TRANSFER_FAILED: AuditSeverity.CRITICAL,
  PAYSTACK_TRANSFER_FAILED: AuditSeverity.CRITICAL,
  SYSTEM_ERROR: AuditSeverity.CRITICAL,
  USER_SUSPEND: AuditSeverity.CRITICAL,

  // HIGH - Significant financial or security actions
  LOGIN_FAILED: AuditSeverity.HIGH,
  PASSWORD_VERIFY_FAILED: AuditSeverity.HIGH,
  TRANSFER_INITIATE: AuditSeverity.HIGH,
  TRANSFER_COMPLETE: AuditSeverity.HIGH,
  SMIPAY_TAG_TRANSFER: AuditSeverity.HIGH,
  PAYSTACK_TRANSFER_INITIATE: AuditSeverity.HIGH,
  PAYSTACK_TRANSFER_COMPLETE: AuditSeverity.HIGH,
  PASSWORD_RESET_COMPLETE: AuditSeverity.HIGH,
  DVA_DEACTIVATE: AuditSeverity.HIGH,
  CARD_CREATE: AuditSeverity.HIGH,
  CARD_FUND: AuditSeverity.HIGH,
  CARD_TERMINATE: AuditSeverity.HIGH,
  WALLET_DEBIT: AuditSeverity.HIGH,
  FUND_WALLET_COMPLETE: AuditSeverity.HIGH,
  RATE_LIMIT_EXCEEDED: AuditSeverity.HIGH,
  BVN_VERIFY_FAILED: AuditSeverity.HIGH,
  NIN_VERIFY_FAILED: AuditSeverity.HIGH,
  ID_VERIFY_FAILED: AuditSeverity.HIGH,

  // MEDIUM - Notable actions worth monitoring
  LOGIN: AuditSeverity.MEDIUM,
  LOGOUT: AuditSeverity.MEDIUM,
  REGISTER_COMPLETE: AuditSeverity.MEDIUM,
  MINIMAL_REGISTER: AuditSeverity.MEDIUM,
  PASSWORD_RESET_REQUEST: AuditSeverity.MEDIUM,
  PROFILE_UPDATE: AuditSeverity.MEDIUM,
  KYC_UPDATE: AuditSeverity.MEDIUM,
  TRANSACTION_PIN_SETUP: AuditSeverity.MEDIUM,
  TRANSACTION_PIN_UPDATE: AuditSeverity.MEDIUM,
  DVA_CREATE: AuditSeverity.MEDIUM,
  VIRTUAL_ACCOUNT_CREATE: AuditSeverity.MEDIUM,
  FUND_WALLET_INIT: AuditSeverity.MEDIUM,
  WALLET_CREDIT: AuditSeverity.MEDIUM,
  AIRTIME_PURCHASE: AuditSeverity.MEDIUM,
  AIRTIME_PURCHASE_FAILED: AuditSeverity.MEDIUM,
  DATA_PURCHASE: AuditSeverity.MEDIUM,
  DATA_PURCHASE_FAILED: AuditSeverity.MEDIUM,
  CABLE_PURCHASE: AuditSeverity.MEDIUM,
  CABLE_PURCHASE_FAILED: AuditSeverity.MEDIUM,
  EDUCATION_PURCHASE: AuditSeverity.MEDIUM,
  EDUCATION_PURCHASE_FAILED: AuditSeverity.MEDIUM,
  ELECTRICITY_PURCHASE: AuditSeverity.MEDIUM,
  ELECTRICITY_PURCHASE_FAILED: AuditSeverity.MEDIUM,
  INSURANCE_PURCHASE: AuditSeverity.MEDIUM,
  INSURANCE_PURCHASE_FAILED: AuditSeverity.MEDIUM,
  BVN_VERIFY: AuditSeverity.MEDIUM,
  NIN_VERIFY: AuditSeverity.MEDIUM,
  ID_VERIFY: AuditSeverity.MEDIUM,
  CARD_FREEZE: AuditSeverity.MEDIUM,
  CARD_UNFREEZE: AuditSeverity.MEDIUM,
  WEBHOOK_PAYSTACK: AuditSeverity.MEDIUM,
  WEBHOOK_FLUTTERWAVE: AuditSeverity.MEDIUM,
  WEBHOOK_VTPASS: AuditSeverity.MEDIUM,
  USER_ACTIVATE: AuditSeverity.MEDIUM,
  USER_ROLE_CHANGE: AuditSeverity.HIGH,
  USER_TIER_CHANGE: AuditSeverity.MEDIUM,
};

/**
 * Human-readable default descriptions for each action.
 * Used as fallback when caller doesn't provide a custom description.
 */
export const ACTION_DESCRIPTION_MAP: Record<AuditAction, string> = {
  // Authentication
  LOGIN: 'User logged in',
  LOGIN_FAILED: 'Login attempt failed',
  LOGOUT: 'User logged out',
  SESSION_REFRESH: 'Session refreshed',
  TOKEN_REFRESH: 'Access token refreshed',
  PASSWORD_VERIFY: 'Password verified successfully',
  PASSWORD_VERIFY_FAILED: 'Password verification failed',
  LOGIN_STATUS_CHECK: 'Login status checked',

  // Registration
  REGISTER_START: 'Registration started',
  REGISTER_RESEND_OTP: 'Registration OTP resent',
  REGISTER_VERIFY_OTP: 'Registration OTP verified',
  REGISTER_SUBMIT_ID: 'Identity document submitted',
  REGISTER_SUBMIT_ADDRESS: 'Residential address submitted',
  REGISTER_SUBMIT_PEP: 'PEP declaration submitted',
  REGISTER_SUBMIT_INCOME: 'Income declaration submitted',
  REGISTER_SETUP_PASSWORD: 'Account password set up',
  REGISTER_COMPLETE: 'Registration completed',
  MINIMAL_REGISTER: 'Minimal registration completed',
  MINIMAL_LOGIN: 'Minimal login completed',

  // Email & OTP
  EMAIL_OTP_REQUEST: 'Email OTP requested',
  EMAIL_OTP_VERIFY: 'Email OTP verified',
  PASSWORD_RESET_REQUEST: 'Password reset requested',
  PASSWORD_RESET_VERIFY: 'Password reset OTP verified',
  PASSWORD_RESET_COMPLETE: 'Password reset completed',

  // User Management
  PROFILE_VIEW: 'Profile viewed',
  PROFILE_UPDATE: 'Profile updated',
  KYC_VIEW: 'KYC information viewed',
  KYC_UPDATE: 'KYC information updated',
  TRANSACTION_PIN_SETUP: 'Transaction PIN set up',
  TRANSACTION_PIN_UPDATE: 'Transaction PIN updated',
  DASHBOARD_VIEW: 'Dashboard viewed',
  HOMEPAGE_VIEW: 'Homepage viewed',

  // Banking
  FUND_WALLET_INIT: 'Wallet funding initiated',
  FUND_WALLET_VERIFY: 'Wallet funding verified',
  FUND_WALLET_COMPLETE: 'Wallet funded successfully',
  VIRTUAL_ACCOUNT_CREATE: 'Virtual account created',
  ACCOUNT_NUMBER_VERIFY: 'Account number verified',
  BANK_LIST_FETCH: 'Bank list fetched',
  DVA_CREATE: 'Dedicated virtual account created',
  DVA_DEACTIVATE: 'Dedicated virtual account deactivated',
  DVA_VIEW: 'Dedicated virtual account viewed',
  DVA_LIST: 'Dedicated virtual accounts listed',

  // Transfers
  TRANSFER_INITIATE: 'Money transfer initiated',
  TRANSFER_COMPLETE: 'Money transfer completed',
  TRANSFER_FAILED: 'Money transfer failed',
  SMIPAY_TAG_LOOKUP: 'Smipay tag lookup performed',
  SMIPAY_TAG_TRANSFER: 'Smipay tag transfer completed',
  PAYSTACK_TRANSFER_INITIATE: 'Paystack transfer initiated',
  PAYSTACK_TRANSFER_COMPLETE: 'Paystack transfer completed',
  PAYSTACK_TRANSFER_FAILED: 'Paystack transfer failed',

  // Wallet
  WALLET_CREDIT: 'Wallet credited',
  WALLET_DEBIT: 'Wallet debited',
  WALLET_BALANCE_CHECK: 'Wallet balance checked',

  // Airtime
  AIRTIME_PURCHASE: 'Airtime purchased',
  AIRTIME_PURCHASE_FAILED: 'Airtime purchase failed',
  AIRTIME_PROVIDERS_FETCH: 'Airtime providers fetched',

  // Data
  DATA_PURCHASE: 'Data bundle purchased',
  DATA_PURCHASE_FAILED: 'Data purchase failed',
  DATA_PLANS_FETCH: 'Data plans fetched',
  DATA_PROVIDERS_FETCH: 'Data providers fetched',

  // Cable
  CABLE_SMARTCARD_VERIFY: 'Smartcard number verified',
  CABLE_PURCHASE: 'Cable subscription purchased',
  CABLE_PURCHASE_FAILED: 'Cable subscription purchase failed',
  CABLE_PROVIDERS_FETCH: 'Cable providers fetched',
  CABLE_PLANS_FETCH: 'Cable plans fetched',

  // Education
  EDUCATION_PURCHASE: 'Education pin purchased',
  EDUCATION_PURCHASE_FAILED: 'Education pin purchase failed',

  // Electricity
  ELECTRICITY_METER_VERIFY: 'Electricity meter number verified',
  ELECTRICITY_PURCHASE: 'Electricity token purchased',
  ELECTRICITY_PURCHASE_FAILED: 'Electricity token purchase failed',

  // Insurance
  INSURANCE_PURCHASE: 'Insurance purchased',
  INSURANCE_PURCHASE_FAILED: 'Insurance purchase failed',

  // Betting
  BETTING_VALIDATE: 'Betting account validated',
  BETTING_FUND: 'Betting account funded',

  // Cards
  CARD_CREATE: 'Virtual card created',
  CARD_LIST: 'Virtual cards listed',
  CARD_FUND: 'Virtual card funded',
  CARD_FREEZE: 'Virtual card frozen',
  CARD_UNFREEZE: 'Virtual card unfrozen',
  CARD_TERMINATE: 'Virtual card terminated',

  // KYC
  BVN_VERIFY: 'BVN verified',
  BVN_VERIFY_FAILED: 'BVN verification failed',
  NIN_VERIFY: 'NIN verified',
  NIN_VERIFY_FAILED: 'NIN verification failed',
  ID_VERIFY: 'ID document verified',
  ID_VERIFY_FAILED: 'ID document verification failed',

  // Support
  SUPPORT_TICKET_CREATE: 'Support ticket created',
  SUPPORT_TICKET_VIEW: 'Support ticket viewed',
  SUPPORT_TICKET_UPDATE: 'Support ticket updated',
  SUPPORT_MESSAGE_ADD: 'Support message added',

  // Push Notifications
  DEVICE_TOKEN_REGISTER: 'Device token registered',
  DEVICE_TOKEN_REMOVE: 'Device token removed',
  NOTIFICATION_SEND: 'Push notification sent',

  // Admin
  TIER_CREATE: 'Account tier created',
  TIER_UPDATE: 'Account tier updated',
  TIER_LIST: 'Account tiers listed',
  USER_SUSPEND: 'User account suspended',
  USER_ACTIVATE: 'User account activated',
  USER_ROLE_CHANGE: 'User role changed',
  USER_TIER_CHANGE: 'User tier changed',
  USER_VIEW: 'User details viewed',
  ADMIN_LOGIN: 'Admin logged in',
  AUDIT_LOG_VIEW: 'Audit logs viewed',
  AUDIT_LOG_FLAG: 'Audit log entry flagged',
  AUDIT_LOG_REVIEW: 'Audit log entry reviewed',

  // Referrals
  REFERRAL_CONFIG_UPDATE: 'Referral config updated',
  REFERRAL_MANUAL_APPROVE: 'Referral manually approved',
  REFERRAL_MANUAL_REJECT: 'Referral manually rejected',

  // Cashback
  CASHBACK_CONFIG_UPDATE: 'Cashback config updated',
  CASHBACK_RULE_CREATE: 'Cashback rule created',
  CASHBACK_RULE_UPDATE: 'Cashback rule updated',
  CASHBACK_RULE_DELETE: 'Cashback rule deleted',

  // Webhooks
  WEBHOOK_PAYSTACK: 'Paystack webhook received',
  WEBHOOK_FLUTTERWAVE: 'Flutterwave webhook received',
  WEBHOOK_VTPASS: 'VTpass webhook received',

  // System
  CRON_TRANSACTION_REQUERY: 'Transaction requery executed',
  CRON_KEEPALIVE: 'Keep-alive ping executed',
  SYSTEM_ERROR: 'System error occurred',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',

  // Transaction History
  TRANSACTION_HISTORY_VIEW: 'Transaction history viewed',
  TRANSACTION_DETAIL_VIEW: 'Transaction details viewed',
};
