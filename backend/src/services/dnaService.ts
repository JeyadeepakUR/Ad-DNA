import crypto from 'crypto';
import { DNAFingerprint, VerificationResult, ComplianceSummary, ComplianceLevel } from '../../../shared/types';
import registry from '../registry';
import * as imghash from 'imghash';
import { createWorker } from 'tesseract.js';
const getPalette = require('colorthief').getPalette;
import sharp from 'sharp';
import QRCode from 'qrcode';

const BRAND_COLORS = [
  [0, 83, 159],
  [237, 28, 36],
  [255, 255, 255]
];
const BRAND_RULE_VERSION = 'v1';
const PHASH_THRESHOLD = 5;

function colorDistance(c1: number[], c2: number[]): number {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

function checkColorRuleWithLevel(colors: number[][]): { level: ComplianceLevel; notes: string[] } {
  const notes: string[] = [];
  let minDistance = Infinity;

  for (const color of colors) {
    for (const brandColor of BRAND_COLORS) {
      const dist = colorDistance(color, brandColor);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }

  if (minDistance <= 40) {
    notes.push('Brand color strongly present');
    return { level: 'PASS', notes };
  } else if (minDistance <= 80) {
    notes.push('Brand color weak / subtle');
    return { level: 'WARN', notes };
  } else {
    notes.push('No brand color detected');
    return { level: 'FAIL', notes };
  }
}

async function checkSafeZoneWithLevel(buffer: Buffer): Promise<{ level: ComplianceLevel; notes: string[] }> {
  const notes: string[] = [];
  const worker = await createWorker('eng');
  const { data } = await worker.recognize(buffer);
  await worker.terminate();

  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (data.words.length === 0) {
    notes.push('No text detected');
    return { level: 'PASS', notes };
  }

  let minMargin = Infinity;

  for (const word of data.words) {
    const bbox = word.bbox;
    const marginLeft = bbox.x0;
    const marginTop = bbox.y0;
    const marginRight = width - bbox.x1;
    const marginBottom = height - bbox.y1;
    const wordMinMargin = Math.min(marginLeft, marginTop, marginRight, marginBottom);
    if (wordMinMargin < minMargin) {
      minMargin = wordMinMargin;
    }
  }

  if (minMargin >= 20) {
    notes.push('Comfortable safe zone');
    return { level: 'PASS', notes };
  } else if (minMargin >= 10) {
    notes.push('Text close to edge');
    return { level: 'WARN', notes };
  } else {
    notes.push('Text too close to edge');
    return { level: 'FAIL', notes };
  }
}

function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

function colorToHex(color: number[]): string {
  return color.map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function calculateColorDeviation(colors1: number[][], colors2: number[][]): number {
  let totalDeviation = 0;
  const minLength = Math.min(colors1.length, colors2.length);
  for (let i = 0; i < minLength; i++) {
    totalDeviation += colorDistance(colors1[i], colors2[i]);
  }
  return minLength > 0 ? Math.round((totalDeviation / minLength) * 100) / 100 : 0;
}

async function computeDeterministicDNA(buffer: Buffer, mime: string): Promise<{ dna: string; phash: string; colors: number[][]; width: number; height: number }> {
  const phash = await imghash.hash(buffer, 16, 'hex');
  const colors = await getPalette(buffer, 5);
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const colorHexes = colors.map(colorToHex).sort();
  const sortedColorsString = colorHexes.join(',');

  const dnaSource = `${phash}|${sortedColorsString}|${width}x${height}|${mime}|${BRAND_RULE_VERSION}`;
  const dna = crypto.createHash('sha256').update(dnaSource).digest('hex');

  return { dna, phash, colors, width, height };
}

async function computeComplianceSummary(buffer: Buffer, colors: number[][]): Promise<ComplianceSummary> {
  const colorRuleResult = checkColorRuleWithLevel(colors);
  const safeZoneResult = await checkSafeZoneWithLevel(buffer);

  const allNotes = [...colorRuleResult.notes, ...safeZoneResult.notes];

  return {
    colorRule: colorRuleResult.level,
    safeZone: safeZoneResult.level,
    notes: allNotes
  };
}

export async function generateFingerprint(filename: string, data: Buffer, mime: string): Promise<DNAFingerprint> {
  const { dna, phash, colors, width, height } = await computeDeterministicDNA(data, mime);

  const complianceSummary = await computeComplianceSummary(data, colors);

  const certificateId = crypto.randomUUID();
  const createdAt = Date.now();

  const publicVerifyUrl = process.env.PUBLIC_VERIFY_URL || 'http://localhost:3000';
  const verifyUrl = `${publicVerifyUrl}/verify?dna=${dna}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });

  const fingerprint: DNAFingerprint = {
    dna,
    certificateId,
    metadata: {
      phash,
      colors,
      width,
      height,
      mime,
      brandRuleVersion: BRAND_RULE_VERSION
    },
    compliance: complianceSummary,
    status: 'approved',
    filename,
    createdAt,
    qrCode: qrCodeDataUrl
  };

  registry.registerDNA(dna, fingerprint);
  return fingerprint;
}

export async function verifyFingerprint(data: Buffer, mime: string): Promise<VerificationResult> {
  registry.verificationCount++;
  const verificationTime = Date.now();

  const { dna, phash, colors } = await computeDeterministicDNA(data, mime);

  const registered = registry.getDNA(dna);

  if (!registered) {
    const allFingerprints = registry.getAll();
    let nearestEntry: DNAFingerprint | null = null;
    let nearestDistance = Infinity;

    for (const entry of allFingerprints) {
      const distance = hammingDistance(phash, entry.metadata.phash);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEntry = entry;
      }
    }

    if (nearestEntry && nearestDistance <= 10) {
      registry.tamperFlagCount++;
      const currentCompliance = await computeComplianceSummary(data, colors);
      const colorDeviation = calculateColorDeviation(colors, nearestEntry.metadata.colors);
      const colorRuleChanged = currentCompliance.colorRule !== nearestEntry.compliance.colorRule;
      const safeZoneChanged = currentCompliance.safeZone !== nearestEntry.compliance.safeZone;

      return {
        status: 'tampered',
        dnaMatch: false,
        delta: {
          phashDistance: nearestDistance,
          colorRuleChanged,
          safeZoneChanged,
          dominantColorDeviation: colorDeviation
        },
        storedCompliance: nearestEntry.compliance,
        currentCompliance,
        complianceDelta: {
          colorRuleChanged,
          safeZoneChanged
        },
        storedCertificate: nearestEntry,
        verificationTime
      };
    }

    return {
      status: 'unregistered',
      dnaMatch: false,
      verificationTime
    };
  }

  if (registered.status === 'revoked') {
    return {
      status: 'revoked',
      dnaMatch: true,
      storedCertificate: registered,
      storedCompliance: registered.compliance,
      verificationTime
    };
  }

  const currentCompliance = await computeComplianceSummary(data, colors);
  const phashDistance = hammingDistance(phash, registered.metadata.phash);
  const colorDeviation = calculateColorDeviation(colors, registered.metadata.colors);

  const colorRuleChanged = currentCompliance.colorRule !== registered.compliance.colorRule;
  const safeZoneChanged = currentCompliance.safeZone !== registered.compliance.safeZone;

  const delta = {
    phashDistance,
    colorRuleChanged,
    safeZoneChanged,
    dominantColorDeviation: colorDeviation
  };

  const complianceDelta = {
    colorRuleChanged,
    safeZoneChanged
  };

  if (phashDistance <= PHASH_THRESHOLD && !colorRuleChanged && !safeZoneChanged) {
    return {
      status: 'valid',
      dnaMatch: true,
      delta,
      storedCompliance: registered.compliance,
      currentCompliance,
      complianceDelta,
      storedCertificate: registered,
      verificationTime
    };
  } else {
    registry.tamperFlagCount++;
    return {
      status: 'tampered',
      dnaMatch: true,
      delta,
      storedCompliance: registered.compliance,
      currentCompliance,
      complianceDelta,
      storedCertificate: registered,
      verificationTime
    };
  }
}
