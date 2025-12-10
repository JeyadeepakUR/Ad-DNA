# Ad DNA – AI-Powered Creative Fingerprinting

A deterministic fingerprinting system for retail creative assets. Ad DNA generates perceptual hashes and compliance certificates for approved creatives, enabling public verification against tampering, unauthorized modifications, and phishing. The system detects tampered variants using pHash nearest-match analysis and issues QR-based verification certificates. Features include brand compliance scoring (color rules, safe zones), revocation management, and phishing URL detection.

## Repository Structure

```
ad-dna/
├── backend/          # Node.js + Fastify API
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── services/ # DNA generation & verification logic
│   │   ├── registry.ts # In-memory fingerprint storage
│   │   └── server.ts
│   └── package.json
├── frontend/         # Next.js web interface
│   ├── pages/
│   │   └── index.tsx # Main UI (registration, verification, stats)
│   └── package.json
└── shared/
    └── types.ts      # Shared TypeScript interfaces
```

**Backend**: Fastify server handling DNA generation, verification, compliance checks, and registry management.  
**Frontend**: Next.js UI with internal registration panel and public verification tools.

## Local Development Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd ad-dna
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3001
PUBLIC_VERIFY_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_BASE=http://localhost:3001
```

### 4. Run Locally
```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Runs on http://localhost:3001

# Terminal 2 - Frontend
cd frontend
npm run dev
# Runs on http://localhost:3000
```

**CORS**: Backend allows all origins (`*`) for development. Restrict in production if needed.

## Deployment Instructions

### Backend on Render

1. Create new **Web Service** on Render
2. Connect repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run dev`
4. Add environment variable:
   ```
   PUBLIC_VERIFY_URL=https://your-frontend.vercel.app
   ```
5. Deploy

### Frontend on Vercel

1. Import project to Vercel
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_BASE=https://your-backend.onrender.com
   ```
4. Deploy

**QR Codes**: After deployment, generated QR codes link to the production verification endpoint and work globally.

## API Endpoints

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/generate-dna` | POST | Internal | Register creative, generate DNA certificate with QR code |
| `/verify` | POST | Public | Verify creative authenticity and detect tampering |
| `/remove-dna/:dna` | DELETE | Internal | Revoke DNA certificate (soft delete) |
| `/phishing-check` | POST | Public | Validate URL against whitelist |
| `/stats` | GET | Internal | Retrieve registry metrics |

## How Verification Works

### DNA Generation
- Computes perceptual hash (pHash) of image using imghash
- Extracts 5 dominant colors via colorthief, sorted for determinism
- Combines: `pHash | sortedColors | dimensions | mime | brandRuleVersion`
- Produces SHA-256 hash as DNA fingerprint
- DNA is **deterministic**: identical for the same input

### Registry & Certificates
- Approved creatives stored with metadata, compliance scores, and timestamps
- Certificate includes: DNA, pHash, colors, dimensions, compliance summary, QR code
- Status: `approved` or `revoked`

### Tampering Detection
1. **Exact DNA Match**: Recomputes DNA from uploaded file
   - Match → returns stored certificate
2. **pHash Nearest-Match**: If DNA not found, scans registry for closest pHash
   - Hamming distance ≤ 10 → flags as `TAMPERED`, returns original certificate
   - Distance > 10 → returns `UNREGISTERED`

### Compliance Scoring
- **Color Rule**: Measures minimum distance to brand palette (Tesco blue, red, white)
  - Distance ≤ 40: `PASS`
  - 40-80: `WARN`
  - \> 80: `FAIL`
- **Safe Zone**: OCR detects text proximity to image edges
  - Margin ≥ 20px: `PASS`
  - 10-20px: `WARN`
  - < 10px: `FAIL`

### Verification States
- **VALID**: DNA match, no tampering, compliance unchanged
- **TAMPERED**: DNA/pHash match found but modifications detected
- **UNREGISTERED**: No matching creative in registry
- **REVOKED**: Certificate explicitly revoked by admin

## Sample Creative Workflow

### 1. Register Creative (Internal)
- Upload image → system validates compliance
- Generates DNA certificate with:
  - Unique DNA hash
  - Certificate ID
  - Compliance scores (PASS/WARN/FAIL)
  - QR code linking to `/verify?dna=<hash>`
- Stores in registry as `approved`

### 2. Verify Creative (Public)
- Upload image or scan QR code
- System recomputes DNA and checks registry
- Returns verification result:
  - **Status**: VALID / TAMPERED / UNREGISTERED / REVOKED
  - **Delta**: pHash distance, color deviation, compliance changes
  - **Original Certificate**: Metadata of registered creative (if matched)

### 3. Detect Tampering
- User uploads modified version of approved creative
- DNA mismatch → triggers pHash nearest-match
- System identifies original creative (Hamming distance ≤ 10)
- Flags as `TAMPERED` with details:
  - pHash drift
  - Color deviation
  - Compliance changes
  - Reference to original certificate

## Hackathon Notes

### Current Limitations
- **In-Memory Registry**: Data lost on server restart (demo only)
- **No Persistence**: No database integration
- **OCR Performance**: Tesseract.js may be slow for large images
- **Single-Instance**: No distributed registry

### Production Improvements
- Replace in-memory registry with PostgreSQL/MongoDB
- Add cryptographic signing (HMAC/RSA) for certificates
- Implement admin authentication for internal endpoints
- Add rate limiting and abuse prevention
- Create brand rule editor for dynamic compliance configuration
- Support batch registration/verification
- Add webhook notifications for tampered creatives
- Implement certificate expiry and renewal
- Add analytics dashboard with detailed tamper reports

### Tech Stack
- **Backend**: Node.js, Fastify, TypeScript, Sharp, Tesseract.js, Colorthief, imghash, QRCode
- **Frontend**: Next.js, React, TypeScript
- **Compliance**: Custom perceptual hash + color analysis + OCR-based safe zone detection
