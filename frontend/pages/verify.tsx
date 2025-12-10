import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

type ComplianceLevel = 'PASS' | 'WARN' | 'FAIL';

interface ComplianceSummary {
  colorRule: ComplianceLevel;
  safeZone: ComplianceLevel;
  notes: string[];
}

interface DNAResult {
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

interface VerifyResult {
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
  storedCertificate?: DNAResult;
  verificationTime: number;
}

export default function VerifyPage() {
  const router = useRouter();
  const { dna } = router.query;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    if (!dna || typeof dna !== 'string') return;

    const fetchVerification = async () => {
      setLoading(true);
      setError(null);

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
        const response = await fetch(`${API_BASE}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dna })
        });

        if (!response.ok) {
          throw new Error(`Verification failed: ${response.statusText}`);
        }

        const data = await response.json();
        setResult(data);
      } catch (err: any) {
        setError(err.message || 'Failed to verify creative');
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [dna]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return '#10b981';
      case 'tampered': return '#f59e0b';
      case 'unregistered': return '#6b7280';
      case 'revoked': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getComplianceColor = (level: ComplianceLevel) => {
    switch (level) {
      case 'PASS': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'FAIL': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (!dna) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.errorTitle}>Invalid Request</h1>
          <p style={styles.errorText}>No DNA parameter provided in URL.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Verifying creative...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.errorTitle}>Verification Error</h1>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.errorTitle}>No Result</h1>
          <p style={styles.errorText}>No verification result received.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Status Header */}
        <div style={{
          ...styles.statusHeader,
          backgroundColor: getStatusColor(result.status)
        }}>
          <h1 style={styles.statusTitle}>{result.status.toUpperCase()}</h1>
          <p style={styles.statusSubtitle}>
            {result.status === 'valid' && 'This creative is officially registered and unmodified.'}
            {result.status === 'tampered' && 'This creative has been modified from the original.'}
            {result.status === 'unregistered' && 'This creative is not in the official registry.'}
            {result.status === 'revoked' && 'This certificate has been revoked.'}
          </p>
        </div>

        {/* Unregistered Message */}
        {result.status === 'unregistered' && (
          <div style={styles.section}>
            <p style={styles.unregisteredText}>
              This creative is not in the official registry. It may be unauthorized or not yet approved.
            </p>
          </div>
        )}

        {/* Creative Certificate */}
        {result.storedCertificate && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Creative Certificate</h2>
            
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.label}>Certificate ID:</span>
                <span style={styles.value}>{result.storedCertificate.certificateId}</span>
              </div>
              
              <div style={styles.infoItem}>
                <span style={styles.label}>DNA Hash:</span>
                <span style={styles.valueCode}>{result.storedCertificate.dna}</span>
              </div>
              
              <div style={styles.infoItem}>
                <span style={styles.label}>Filename:</span>
                <span style={styles.value}>{result.storedCertificate.filename}</span>
              </div>
              
              <div style={styles.infoItem}>
                <span style={styles.label}>Created:</span>
                <span style={styles.value}>{formatDate(result.storedCertificate.createdAt)}</span>
              </div>
              
              <div style={styles.infoItem}>
                <span style={styles.label}>Status:</span>
                <span style={{
                  ...styles.badge,
                  backgroundColor: result.storedCertificate.status === 'approved' ? '#10b981' : '#ef4444'
                }}>
                  {result.storedCertificate.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Compliance Summary */}
            <div style={styles.complianceSection}>
              <h3 style={styles.subsectionTitle}>Compliance Summary</h3>
              <div style={styles.complianceGrid}>
                <div style={styles.complianceItem}>
                  <span style={styles.label}>Color Rule:</span>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: getComplianceColor(result.storedCertificate.compliance.colorRule)
                  }}>
                    {result.storedCertificate.compliance.colorRule}
                  </span>
                </div>
                <div style={styles.complianceItem}>
                  <span style={styles.label}>Safe Zone:</span>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: getComplianceColor(result.storedCertificate.compliance.safeZone)
                  }}>
                    {result.storedCertificate.compliance.safeZone}
                  </span>
                </div>
              </div>
              {result.storedCertificate.compliance.notes.length > 0 && (
                <div style={styles.notesSection}>
                  <span style={styles.label}>Notes:</span>
                  <ul style={styles.notesList}>
                    {result.storedCertificate.compliance.notes.map((note, idx) => (
                      <li key={idx} style={styles.note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div style={styles.metadataSection}>
              <h3 style={styles.subsectionTitle}>Metadata</h3>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.label}>pHash:</span>
                  <span style={styles.valueCode}>
                    {result.storedCertificate.metadata.phash.substring(0, 16)}...
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Dimensions:</span>
                  <span style={styles.value}>
                    {result.storedCertificate.metadata.width} × {result.storedCertificate.metadata.height}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>MIME Type:</span>
                  <span style={styles.value}>{result.storedCertificate.metadata.mime}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.label}>Brand Rule Version:</span>
                  <span style={styles.value}>{result.storedCertificate.metadata.brandRuleVersion}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tamper Detection */}
        {result.status === 'tampered' && result.delta && (
          <div style={styles.section}>
            <h2 style={{...styles.sectionTitle, color: '#f59e0b'}}>Tamper Detection</h2>
            
            <div style={styles.tamperWarning}>
              <p style={styles.tamperText}>
                This creative has been modified from the original registered version.
              </p>
            </div>

            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.label}>pHash Distance:</span>
                <span style={styles.value}>{result.delta.phashDistance}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Color Deviation:</span>
                <span style={styles.value}>{result.delta.dominantColorDeviation.toFixed(2)}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.label}>Compliance Changed:</span>
                <span style={styles.value}>
                  {result.delta.colorRuleChanged || result.delta.safeZoneChanged ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {result.storedCertificate && (
              <div style={styles.derivedSection}>
                <h3 style={styles.subsectionTitle}>Derived From</h3>
                <div style={styles.infoGrid}>
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Original Certificate:</span>
                    <span style={styles.value}>{result.storedCertificate.certificateId}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Original Filename:</span>
                    <span style={styles.value}>{result.storedCertificate.filename}</span>
                  </div>
                  <div style={styles.infoItem}>
                    <span style={styles.label}>Original Created:</span>
                    <span style={styles.value}>{formatDate(result.storedCertificate.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification Info */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Verified at {formatDate(result.verificationTime)}
          </p>
          <p style={styles.footerText}>
            DNA Match: {result.dnaMatch ? 'Exact' : 'Nearest Match'}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  statusHeader: {
    padding: '40px 30px',
    textAlign: 'center',
    color: 'white'
  },
  statusTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    letterSpacing: '2px'
  },
  statusSubtitle: {
    fontSize: '18px',
    margin: 0,
    opacity: 0.95
  },
  section: {
    padding: '30px',
    borderBottom: '1px solid #e5e7eb'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 20px 0',
    color: '#111827'
  },
  subsectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '20px 0 15px 0',
    color: '#374151'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  value: {
    fontSize: '15px',
    color: '#111827',
    fontWeight: '500'
  },
  valueCode: {
    fontSize: '14px',
    color: '#111827',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px',
    wordBreak: 'break-all'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  complianceSection: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  complianceGrid: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  complianceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  notesSection: {
    marginTop: '15px'
  },
  notesList: {
    margin: '10px 0 0 0',
    paddingLeft: '20px'
  },
  note: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '5px'
  },
  metadataSection: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  tamperWarning: {
    backgroundColor: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px'
  },
  tamperText: {
    margin: 0,
    color: '#92400e',
    fontSize: '15px',
    fontWeight: '500'
  },
  derivedSection: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca'
  },
  unregisteredText: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: '1.6',
    margin: 0
  },
  footer: {
    padding: '20px 30px',
    backgroundColor: '#f9fafb',
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px'
  },
  footerText: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0
  },
  spinner: {
    width: '50px',
    height: '50px',
    margin: '0 auto',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '16px',
    marginTop: '20px'
  },
  errorTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#ef4444',
    margin: '0 0 15px 0'
  },
  errorText: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0
  }
};
