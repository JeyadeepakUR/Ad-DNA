export interface CreativeFile {
  filename: string;
  data: Buffer;
  contentType: string;
}

export type ComplianceLevel = 'PASS' | 'WARN' | 'FAIL';

export interface ComplianceSummary {
  colorRule: ComplianceLevel;
  safeZone: ComplianceLevel;
  notes: string[];
}

export interface DNAFingerprint {
  dna: string;
  certificateId: string;
  metadata: {
    phash: string;
    colors: number[][];
    width: number;
    height: number;
    mime: string;
    brandRuleVersion: string;
  };
  compliance: ComplianceSummary;
  status: 'approved' | 'revoked';
  filename: string;
  createdAt: number;
  revokedAt?: number;
  qrCode?: string;
}

export interface VerificationResult {
  status: 'valid' | 'tampered' | 'unregistered' | 'revoked';
  dnaMatch: boolean;
  delta?: {
    phashDistance: number;
    colorRuleChanged: boolean;
    safeZoneChanged: boolean;
    dominantColorDeviation: number;
  };
  storedCompliance?: ComplianceSummary;
  currentCompliance?: ComplianceSummary;
  complianceDelta?: {
    colorRuleChanged: boolean;
    safeZoneChanged: boolean;
  };
  storedCertificate?: DNAFingerprint;
  verificationTime: number;
}
