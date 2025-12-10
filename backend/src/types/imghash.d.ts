declare module 'imghash' {
  interface ImgHash {
    hash(filepath: string | Buffer, bits?: number, format?: 'hex' | 'binary'): Promise<string>;
    hexToBinary(hex: string): string;
    binaryToHex(binary: string): string;
  }
  
  const imghash: ImgHash;
  export default imghash;
}
