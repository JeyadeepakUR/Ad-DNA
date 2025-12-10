declare module 'imghash' {
  function hash(filepath: string | Buffer, bits?: number, format?: 'hex' | 'binary'): Promise<string>;
  function hexToBinary(hex: string): string;
  function binaryToHex(binary: string): string;
  
  export = hash;
}
