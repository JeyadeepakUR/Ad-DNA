import { DNAFingerprint } from './types/shared';

class FingerprintRegistry {
  private registry: Map<string, DNAFingerprint> = new Map();
  public verificationCount: number = 0;
  public tamperFlagCount: number = 0;

  registerDNA(dna: string, metadata: DNAFingerprint): void {
    this.registry.set(dna, metadata);
  }

  getDNA(dna: string): DNAFingerprint | undefined {
    return this.registry.get(dna);
  }

  revokeDNA(dna: string): boolean {
    const entry = this.registry.get(dna);
    if (!entry) return false;
    entry.status = 'revoked';
    entry.revokedAt = Date.now();
    this.registry.set(dna, entry);
    return true;
  }

  getAll(): DNAFingerprint[] {
    return Array.from(this.registry.values());
  }

  incrementVerificationCount(): void {
    this.verificationCount++;
  }

  incrementTamperFlagCount(): void {
    this.tamperFlagCount++;
  }

  getStats() {
    const all = this.getAll();
    return {
      totalRegistered: all.filter(f => f.status === 'approved').length,
      totalRevoked: all.filter(f => f.status === 'revoked').length,
      totalVerifications: this.verificationCount,
      totalTamperFlags: this.tamperFlagCount
    };
  }
}

export default new FingerprintRegistry();
