declare module 'imghash' {
  export function hash(filepath: string | Buffer, bits?: number, format?: 'hex' | 'binary'): Promise<string>;
  export function hexToBinary(hex: string): string;
  export function binaryToHex(binary: string): string;
}
