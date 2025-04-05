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