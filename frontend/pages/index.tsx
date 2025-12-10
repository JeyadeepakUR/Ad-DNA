import { useState } from 'react';

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

export default function Home() {
  const [generateFile, setGenerateFile] = useState<File | null>(null);
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [dnaResult, setDnaResult] = useState<DNAResult | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [url, setUrl] = useState<string>('');
  const [phishingResult, setPhishingResult] = useState<{ authentic: boolean; domain: string } | null>(null);
  const [dnaToRemove, setDnaToRemove] = useState<string>('');
  const [removeResult, setRemoveResult] = useState<string>('');
  const [stats, setStats] = useState<{ totalRegistered: number; totalRevoked: number; totalVerifications: number; totalTamperFlags: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

  const handleGenerateDNA = async () => {
    if (!generateFile) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', generateFile);
      const res = await fetch(`${API_BASE}/generate-dna`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate DNA');
      }
      const data = await res.json();
      setDnaResult(data);
      fetchStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyFile) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', verifyFile);
      const res = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to verify');
      }
      const data = await res.json();
      setVerifyResult(data);
      fetchStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhishingCheck = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/phishing-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to check URL');
      }
      const data = await res.json();
      setPhishingResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDNA = async () => {
    if (!dnaToRemove) return;
    setLoading(true);
    setError('');
    setRemoveResult('');
    try {
      const res = await fetch(`${API_BASE}/remove-dna/${dnaToRemove}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove DNA');
      }
      const data = await res.json();
      setRemoveResult(data.message);
      setDnaToRemove('');
      fetchStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useState(() => {
    fetchStats();
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '1rem', color: '#333' }}>Ad-DNA</h1>

      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '1rem', 
          marginBottom: '2rem',
          padding: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          color: 'white'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalRegistered}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Registered Creatives</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalTamperFlags}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Tampering Detected</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalVerifications}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Total Verifications</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalRevoked}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Revoked Certificates</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ border: '2px solid #0070f3', borderRadius: '8px', padding: '1.5rem', background: '#f0f8ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🔒</span>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#0070f3' }}>Generate DNA</h2>
            <span style={{ fontSize: '0.75rem', background: '#0070f3', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: 'auto' }}>INTERNAL</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>Authorized personnel only. Register creative assets.</p>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => e.target.files && setGenerateFile(e.target.files[0])}
            style={{ marginBottom: '1rem', display: 'block' }}
          />
          <button
            onClick={handleGenerateDNA}
            disabled={!generateFile || loading}
            style={{
              padding: '0.5rem 1.5rem',
              background: generateFile && !loading ? '#0070f3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: generateFile && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Processing...' : 'Generate DNA'}
          </button>

          {dnaResult && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#333' }}>DNA Generated</h3>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0 }}><strong>DNA:</strong> <code style={{ fontSize: '0.75rem' }}>{dnaResult.dna.slice(0, 32)}...</code></p>
                  <button
                    onClick={() => navigator.clipboard.writeText(dnaResult.dna)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.7rem',
                      background: '#0070f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                    title="Copy full DNA"
                  >
                    Copy
                  </button>
                </div>
                <p><strong>Certificate ID:</strong> {dnaResult.certificateId}</p>
                <p><strong>Filename:</strong> {dnaResult.filename}</p>
                <p><strong>Created:</strong> {new Date(dnaResult.createdAt).toLocaleString()}</p>
                <p><strong>pHash:</strong> <code>{dnaResult.metadata.phash.slice(0, 16)}...</code></p>
                <p><strong>Dimensions:</strong> {dnaResult.metadata.width}x{dnaResult.metadata.height}</p>
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Colors:</strong>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {dnaResult.metadata.colors.map((color, i) => (
                      <div
                        key={i}
                        style={{
                          width: '40px',
                          height: '40px',
                          background: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                        }}
                        title={`RGB(${color.join(', ')})`}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px' }}>
                  <strong>Compliance:</strong>
                  <p>Color Rule: <span style={{ 
                    color: dnaResult.compliance.colorRule === 'PASS' ? 'green' : 
                           dnaResult.compliance.colorRule === 'WARN' ? 'orange' : 'red' 
                  }}>
                    {dnaResult.compliance.colorRule === 'PASS' ? '✓ Pass' : 
                     dnaResult.compliance.colorRule === 'WARN' ? '⚠ Warning' : '✗ Fail'}
                  </span></p>
                  <p>Safe Zone: <span style={{ 
                    color: dnaResult.compliance.safeZone === 'PASS' ? 'green' : 
                           dnaResult.compliance.safeZone === 'WARN' ? 'orange' : 'red' 
                  }}>
                    {dnaResult.compliance.safeZone === 'PASS' ? '✓ Pass' : 
                     dnaResult.compliance.safeZone === 'WARN' ? '⚠ Warning' : '✗ Fail'}
                  </span></p>
                  {dnaResult.compliance.notes.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#555' }}>
                      {dnaResult.compliance.notes.map((note, i) => (
                        <p key={i} style={{ margin: '0.25rem 0' }}>• {note}</p>
                      ))}
                    </div>
                  )}
                </div>
                {dnaResult.qrCode && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <strong>Verification QR Code:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      <img src={dnaResult.qrCode} alt="QR Code" style={{ maxWidth: '150px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>Scan to verify creative</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #10b981', borderRadius: '8px', padding: '1.5rem', background: '#f0fdf4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🌐</span>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#10b981' }}>Verify Creative</h2>
            <span style={{ fontSize: '0.75rem', background: '#10b981', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: 'auto' }}>PUBLIC</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>Check if creative matches registered DNA.</p>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => e.target.files && setVerifyFile(e.target.files[0])}
            style={{ marginBottom: '1rem', display: 'block' }}
          />
          <button
            onClick={handleVerify}
            disabled={!verifyFile || loading}
            style={{
              padding: '0.5rem 1.5rem',
              background: verifyFile && !loading ? '#10b981' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: verifyFile && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>

          {verifyResult && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#333' }}>Verification Result</h3>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  Status: <span style={{
                    color: verifyResult.status === 'valid' ? 'green' : 
                           verifyResult.status === 'tampered' ? 'orange' : 
                           verifyResult.status === 'revoked' ? 'purple' : 'red'
                  }}>
                    {verifyResult.status.toUpperCase()}
                  </span>
                </p>
                <p><strong>DNA Match:</strong> {verifyResult.dnaMatch ? 'Yes' : 'No'}</p>
                <p><strong>Verification Time:</strong> {new Date(verifyResult.verificationTime).toLocaleString()}</p>
                
                {verifyResult.delta && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px' }}>
                    <strong>Delta Analysis:</strong>
                    <p>pHash Distance: {verifyResult.delta.phashDistance}</p>
                    <p>Color Deviation: {verifyResult.delta.dominantColorDeviation}</p>
                    <p>Color Rule Changed: {verifyResult.delta.colorRuleChanged ? 'Yes' : 'No'}</p>
                    <p>Safe Zone Changed: {verifyResult.delta.safeZoneChanged ? 'Yes' : 'No'}</p>
                  </div>
                )}

                {verifyResult.currentCompliance && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px' }}>
                    <strong>Current Compliance:</strong>
                    <p>Color Rule: <span style={{ 
                      color: verifyResult.currentCompliance.colorRule === 'PASS' ? 'green' : 
                             verifyResult.currentCompliance.colorRule === 'WARN' ? 'orange' : 'red' 
                    }}>
                      {verifyResult.currentCompliance.colorRule}
                    </span></p>
                    <p>Safe Zone: <span style={{ 
                      color: verifyResult.currentCompliance.safeZone === 'PASS' ? 'green' : 
                             verifyResult.currentCompliance.safeZone === 'WARN' ? 'orange' : 'red' 
                    }}>
                      {verifyResult.currentCompliance.safeZone}
                    </span></p>
                    {verifyResult.currentCompliance.notes.length > 0 && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                        {verifyResult.currentCompliance.notes.map((note, i) => (
                          <p key={i} style={{ margin: '0.25rem 0' }}>• {note}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {verifyResult.storedCertificate && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fff', borderRadius: '4px' }}>
                    <strong>Original Certificate:</strong>
                    <p>Filename: {verifyResult.storedCertificate.filename}</p>
                    <p>Created: {new Date(verifyResult.storedCertificate.createdAt).toLocaleString()}</p>
                    <p>Certificate ID: {verifyResult.storedCertificate.certificateId}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid #8b5cf6', borderRadius: '8px', padding: '1.5rem', background: '#faf5ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🛡️</span>
          <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#8b5cf6' }}>Phishing Check</h2>
          <span style={{ fontSize: '0.75rem', background: '#8b5cf6', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: 'auto' }}>PUBLIC</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>Verify URL authenticity against whitelist.</p>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL (e.g., https://tesco.com)"
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9rem',
          }}
        />
        <button
          onClick={handlePhishingCheck}
          disabled={!url || loading}
          style={{
            padding: '0.5rem 1.5rem',
            background: url && !loading ? '#8b5cf6' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: url && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Checking...' : 'Check URL'}
        </button>

        {phishingResult && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#333' }}>Result</h3>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              <p><strong>Domain:</strong> {phishingResult.domain}</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                Status: <span style={{ color: phishingResult.authentic ? 'green' : 'red' }}>
                  {phishingResult.authentic ? '✓ Authentic' : '✗ Suspicious'}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ border: '2px solid #ef4444', borderRadius: '8px', padding: '1.5rem', background: '#fef2f2', marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🗑️</span>
          <h2 style={{ fontSize: '1.2rem', margin: 0, color: '#ef4444' }}>Remove DNA</h2>
          <span style={{ fontSize: '0.75rem', background: '#ef4444', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: 'auto' }}>INTERNAL</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>Remove a registered DNA from the registry. This action cannot be undone.</p>
        <input
          type="text"
          value={dnaToRemove}
          onChange={(e) => setDnaToRemove(e.target.value)}
          placeholder="Enter DNA hash to remove"
          style={{
            width: '100%',
            padding: '0.5rem',
            marginBottom: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.9rem',
          }}
        />
        <button
          onClick={handleRemoveDNA}
          disabled={!dnaToRemove || loading}
          style={{
            padding: '0.5rem 1.5rem',
            background: dnaToRemove && !loading ? '#ef4444' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: dnaToRemove && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Removing...' : 'Remove DNA'}
        </button>

        {removeResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '4px' }}>
            {removeResult}
          </div>
        )}
      </div>
    </div>
  );
}
