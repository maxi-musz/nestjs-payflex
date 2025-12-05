/**
 * Bank Logo Mapping Helper
 * Maps Nigerian bank codes to their logo URLs using public APIs
 * 
 * Primary API: https://nigerianbanks.xyz
 * This API returns logos directly in the response, designed for Fintech APIs (Paystack, Flutterwave)
 */

export interface BankLogoConfig {
  logo_url?: string;
  logo_url_light?: string; // For light backgrounds
  logo_url_dark?: string; // For dark backgrounds
}

interface BankData {
  name: string;
  slug: string;
  code: string;
  ussd: string;
  logo: string; // Logo URL is directly provided by the API
}

/**
 * Cache for Nigerian banks data from nigerianbanks.xyz API
 * This is populated on first use and cached for performance
 */
let banksDataCache: BankData[] | null = null;
let bankCodeToLogoMap: Record<string, string> | null = null; // Map bank code -> logo URL for fast lookup
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetch banks data from nigerianbanks.xyz API
 * This API returns logos directly, so we build a code->logo mapping
 * Caches the result for 24 hours
 */
async function fetchBanksData(): Promise<BankData[]> {
  const now = Date.now();
  
  // Return cached data if still valid (within 24 hours)
  if (banksDataCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return banksDataCache;
  }

  try {
    const axios = require('axios');
    // Fetch from nigerianbanks.xyz - it returns logos directly
    const response = await axios.get('https://nigerianbanks.xyz/', {
      timeout: 5000, // 5 second timeout
    });
    const data = response.data || [];
    banksDataCache = data;
    cacheTimestamp = now;
    
    // Build code-to-logo mapping for fast lookups (API already provides logo URLs)
    bankCodeToLogoMap = {};
    data.forEach((bank: BankData) => {
      if (bank.code && bank.logo) {
        bankCodeToLogoMap![bank.code] = bank.logo;
      }
    });
    
    return data;
  } catch (error) {
    console.warn('Failed to fetch banks data from nigerianbanks.xyz, using fallback');
    // If we have stale cache, use it as fallback
    if (banksDataCache) {
      return banksDataCache;
    }
    return [];
  }
}

/**
 * Initialize bank data cache (call this on app startup or first use)
 * This pre-fetches and caches all bank data for fast lookups
 */
export async function initializeBankLogosCache(): Promise<void> {
  try {
    await fetchBanksData();
  } catch (error) {
    console.warn('Failed to initialize bank logos cache:', error);
  }
}

/**
 * Get bank logo URL from nigerianbanks.xyz API by bank code
 * Uses cached mapping for fast synchronous lookups
 * The API already provides logo URLs directly, so we just return them
 */
function getBankLogoFromCache(bankCode: string): string | null {
  // If mapping exists, use it (fast, synchronous)
  // The API already provides full logo URLs, so we just return them
  if (bankCodeToLogoMap && bankCodeToLogoMap[bankCode]) {
    return bankCodeToLogoMap[bankCode];
  }
  
  return null;
}

/**
 * Get bank logo URL from nigerianbanks.xyz API by bank code (async version)
 * Fetches from API if cache is not available
 */
async function getBankLogoFromAPI(bankCode: string): Promise<string | null> {
  try {
    const banks = await fetchBanksData();
    const bank = banks.find(b => b.code === bankCode);
    
    // API already provides logo URLs directly
    return bank?.logo || null;
  } catch (error) {
    return null;
  }
}

/**
 * Minimal static fallback mapping (emergency only)
 * Only used if API cache fails
 */
const BANK_LOGO_FALLBACK: Record<string, string> = {
  // Only keep a few critical banks as absolute last resort
  // The automatic cache should handle everything else
};

/**
 * Get bank logo URL by bank code
 * Automatically uses cached nigerianbanks.xyz API data for ALL banks
 * Falls back to constructing URL from bank name if code not found
 * 
 * @param bankCode - Bank code (e.g., "044", "058")
 * @param bankName - Optional: Bank name (used for fallback URL construction)
 * @param variant - Optional: 'light' or 'dark' for themed logos (not currently supported)
 * @returns Logo URL or null if not found
 */
export function getBankLogo(
  bankCode: string, 
  bankName?: string,
  variant?: 'light' | 'dark'
): string | null {
  // First try cached API mapping (fast, synchronous, covers ALL banks from API automatically)
  // The API already provides full logo URLs, so we just return them
  const cachedLogo = getBankLogoFromCache(bankCode);
  if (cachedLogo) {
    return cachedLogo;
  }

  // Fallback: try to construct URL from bank name using nigerianbanks.xyz format
  // This handles banks that might not be in the API yet
  if (bankName) {
    const bankSlug = bankName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .replace(/limited/gi, '')
      .replace(/ltd/gi, '')
      .replace(/plc/gi, '')
      .replace(/microfinance/gi, 'mfb')
      .replace(/bank/gi, '')
      .replace(/company/gi, '')
      .replace(/nigeria/gi, '')
      .replace(/ng/gi, '')
      .trim();
    
    // Construct URL using nigerianbanks.xyz format
    if (bankSlug) {
      return `https://nigerianbanks.xyz/logo/${bankSlug}.png`;
    }
  }

  // Last resort: static fallback (only if everything else fails)
  if (BANK_LOGO_FALLBACK[bankCode]) {
    return BANK_LOGO_FALLBACK[bankCode];
  }

  return null;
}

/**
 * Get bank logo URL asynchronously from nigerianbanks.xyz API
 * This will fetch from the API and cache the result if not already cached
 * 
 * @param bankCode - Bank code
 * @returns Promise<string | null> - Logo URL or null
 */
export async function getBankLogoAsync(bankCode: string): Promise<string | null> {
  // Try cached lookup first (fast, synchronous)
  // This uses the automatically fetched and mapped data from nigerianbanks.xyz API
  const cachedLogo = getBankLogoFromCache(bankCode);
  if (cachedLogo) {
    return cachedLogo;
  }

  // Try fallback static mapping
  if (BANK_LOGO_FALLBACK[bankCode]) {
    return BANK_LOGO_FALLBACK[bankCode];
  }

  // Try API lookup (will fetch and cache if needed)
  // API already provides logo URLs directly
  return await getBankLogoFromAPI(bankCode);
}

/**
 * Get full bank logo configuration
 * @param bankCode - Bank code
 * @returns BankLogoConfig or null
 */
export function getBankLogoConfig(bankCode: string): BankLogoConfig | null {
  const logoUrl = getBankLogo(bankCode);
  return logoUrl ? { logo_url: logoUrl } : null;
}

/**
 * Check if a bank logo exists for the given code
 * @param bankCode - Bank code
 * @returns boolean
 */
export function hasBankLogo(bankCode: string): boolean {
  return BANK_LOGO_FALLBACK[bankCode] !== undefined || (bankCodeToLogoMap !== null && bankCodeToLogoMap[bankCode] !== undefined);
}

/**
 * Get all bank codes that have logos in fallback
 * @returns Array of bank codes
 */
export function getBankCodesWithLogos(): string[] {
  const fallbackCodes = Object.keys(BANK_LOGO_FALLBACK);
  const cachedCodes = bankCodeToLogoMap ? Object.keys(bankCodeToLogoMap) : [];
  return [...new Set([...fallbackCodes, ...cachedCodes])];
}
