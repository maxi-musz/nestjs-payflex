import { v4 as uuidv4 } from 'uuid';

export function generateReference(): string {
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0]; // yyyy-mm-dd
    const formattedTime = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}-${now.getMilliseconds()}`;
    const uniqueId = uuidv4().slice(-6); // Last 6 chars of UUID

    return `gift_bill-${formattedDate}-${formattedTime}-${uniqueId}`;
}

export function generateSessionId(): string {
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0]; // yyyy-mm-dd
    const formattedTime = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}-${now.getMilliseconds()}`;
    const uniqueId = uuidv4().slice(-6); // Last 6 chars of UUID

    return `sess-id-${formattedDate}-${formattedTime}-${uniqueId}`;
}

/**
 * Generates a unique Smipay tag in the format: smile + 5 alphanumeric characters
 * Example: smileA1B2C, smileX9Y3Z
 * 
 * @param prismaClient - PrismaClient instance to check for uniqueness
 * @param maxRetries - Maximum number of retry attempts if tag already exists (default: 10)
 * @returns A unique smipay tag
 */
export async function generateSmipayTag(
    prismaClient: any, 
    maxRetries: number = 10
): Promise<string> {
    const prefix = 'smile';
    const tagLength = 5;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // Uppercase letters and numbers
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Generate random alphanumeric characters
        let randomPart = '';
        for (let i = 0; i < tagLength; i++) {
            randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        
        const tag = `${prefix}${randomPart}`;
        
        // Check if tag already exists in database
        const existingUser = await prismaClient.user.findUnique({
            where: { smipay_tag: tag }
        });
        
        if (!existingUser) {
            return tag;
        }
    }
    
    // If we've exhausted all retries, append a timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${timestamp}${Math.floor(Math.random() * 10)}`;
}

/**
 * Generate a unique transaction reference and guarantee DB uniqueness.
 * Uses a UUID-based reference and checks the database before returning.
 *
 * Example output: smipay-4f3a6e4d-9fe2-4c77-8d0e-2b0f2f7a1c2b
 */
export async function generateUniqueTransactionReference(
    prismaClient: any,
    prefix: string = 'smipay',
    maxRetries: number = 5
): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const reference = `${prefix}-${uuidv4()}`;

        // Check collision in DB (transaction_reference is unique in schema)
        const existing = await prismaClient.transactionHistory.findUnique({
            where: { transaction_reference: reference }
        });

        if (!existing) {
            return reference;
        }
    }
    // If repeated collisions (extremely unlikely), append timestamp to ensure uniqueness
    return `${prefix}-${uuidv4()}-${Date.now()}`;
}

/**
 * Generate a unique support ticket number in the format: SMI-YYYY-NNNNNN
 * Example: SMI-2025-001234
 * 
 * @param prismaClient - PrismaClient instance to check for uniqueness
 * @param maxRetries - Maximum number of retry attempts if ticket number already exists (default: 10)
 * @returns A unique ticket number
 */
export async function generateTicketNumber(
    prismaClient: any,
    maxRetries: number = 10
): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = 'SMI';
    
    // Get the last ticket number for this year to determine the next sequence
    const lastTicket = await prismaClient.supportTicket.findFirst({
        where: {
            ticket_number: {
                startsWith: `${prefix}-${year}-`
            }
        },
        orderBy: {
            ticket_number: 'desc'
        }
    });

    let sequence = 1;
    if (lastTicket) {
        // Extract sequence number from last ticket (e.g., "SMI-2025-001234" -> 1234)
        const match = lastTicket.ticket_number.match(/-(\d+)$/);
        if (match) {
            sequence = parseInt(match[1], 10) + 1;
        }
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Format sequence as 6-digit number with leading zeros
        const sequenceStr = sequence.toString().padStart(6, '0');
        const ticketNumber = `${prefix}-${year}-${sequenceStr}`;

        // Check if ticket number already exists
        const existing = await prismaClient.supportTicket.findUnique({
            where: { ticket_number: ticketNumber }
        });

        if (!existing) {
            return ticketNumber;
        }

        // If exists, increment and try again
        sequence++;
    }

    // If we've exhausted all retries, append timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}${timestamp}`;
}