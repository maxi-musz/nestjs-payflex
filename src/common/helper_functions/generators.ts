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