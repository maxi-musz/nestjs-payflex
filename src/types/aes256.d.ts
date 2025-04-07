declare module 'aes256' {
    export function encrypt(key: string, text: string): string;
    export function decrypt(key: string, text: string): string;
}