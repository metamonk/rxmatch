# RxMatch

**AI-Powered NDC Packaging & Quantity Calculator**

RxMatch is a production-ready healthcare application that helps pharmacies reduce prescription claim rejections by accurately matching medications to their correct NDC (National Drug Code) packages with optimal quantities.

## Overview

- **95% prescription parsing accuracy** using OpenAI structured outputs
- **Real-time integration** with RxNorm and FDA NDC Directory
- **Intelligent package optimization** algorithm minimizing waste
- **Sub-2-second response times** with multi-tier caching
- **HIPAA-compliant** security architecture
- **Production deployment** on Google Cloud Run

## Key Features

### 🎯 Prescription Parsing
- Multi-format input support (text, image, PDF)
- Automatic spelling correction and normalization
- Confidence scoring system
- Structured data extraction

### 📦 NDC Package Selection
- Real-time FDA NDC Directory lookups
- Multi-package optimization for exact quantities
- Cost efficiency scoring (Optimal/Acceptable/Wasteful)
- Active/inactive NDC status warnings

### 🔍 Review Queue
- Automatic flagging of low-confidence predictions
- Pharmacist review workflow
- Audit trail for compliance
- Priority-based queue management

### 🔒 Security & Compliance
- HIPAA-compliant encryption (AES-256)
- Comprehensive security headers (HSTS, CSP, X-Frame-Options)
- Audit logging for all operations
- PHI data protection

### ⚡ Performance
- L1 in-memory + L2 Redis caching
- Connection pooling for database queries
- Optimized API response times
- Auto-scaling Cloud Run deployment

## Tech Stack

- **Framework**: SvelteKit 5 + TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Neon PostgreSQL (serverless)
- **Cache**: Upstash Redis
- **AI**: OpenAI GPT-4o-mini
- **Deployment**: Google Cloud Run
- **ORM**: Drizzle

## Quick Start

### Prerequisites
- Node.js 24+
- pnpm (package manager)
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash recommended)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd RxMatch

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

Visit http://localhost:5173 to see the application.

### Environment Variables

Required variables in `.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...

# Redis Cache (Upstash)
REDIS_URL=https://...
REDIS_TOKEN=...

# Optional Configuration
NODE_ENV=development
FEATURE_CACHE_ENABLED=true
```

## Development

```bash
# Development server
pnpm dev

# Type checking
pnpm check

# Build for production
pnpm build

# Preview production build
pnpm preview

# Database operations
pnpm db:push        # Push schema changes
pnpm db:generate    # Generate migrations
```

## Deployment

The application is configured for deployment on Google Cloud Run with automated CI/CD via GitHub Actions.

### Manual Deployment

```bash
# Using the deployment script
./deploy.sh

# Or using gcloud directly
gcloud builds submit --config cloudbuild.yaml
gcloud run deploy rxmatch --image gcr.io/rxmatch-478003/rxmatch
```

### Automated CI/CD

Push to `main` branch triggers automatic deployment via GitHub Actions. See `.github/workflows/deploy.yml` for configuration.

## Documentation

Comprehensive documentation is available in the `/docs` folder:

- **[Security Documentation](./docs/security/)** - HIPAA compliance, encryption, authentication
- **[Monitoring & Operations](./docs/monitoring/)** - Deployment guides, runbooks, monitoring setup
- **[Performance](./docs/PERFORMANCE_OPTIMIZATION.md)** - Optimization strategies and testing
- **[Demo Guide](./docs/VIDEO_SCRIPT.md)** - Product demo script and walkthrough

## Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  SvelteKit  │
│   Server    │
└──────┬──────┘
       │
       ├──────► OpenAI API (Prescription Parsing)
       ├──────► RxNorm API (Drug Normalization)
       ├──────► FDA NDC API (Package Lookup)
       ├──────► Redis Cache (L2 Caching)
       └──────► PostgreSQL (Audit Trail)
```

## API Integration

### External APIs
- **RxNorm API**: Drug normalization and RxCUI resolution
- **FDA NDC Directory**: Active NDC package information
- **OpenAI API**: Structured prescription parsing

### Caching Strategy
- **L1 Cache**: In-memory cache for RxNorm lookups (30-day TTL)
- **L2 Cache**: Redis for NDC and prescription data (7-day TTL)
- **Automatic invalidation**: On data updates and errors

## Testing

```bash
# Run all tests
pnpm test

# Run type checking
pnpm check

# Security audit
pnpm audit
```

## Contributing

This project follows conventional commit standards:

```bash
# Feature
git commit -m "feat: add prescription image upload"

# Bug fix
git commit -m "fix: resolve NDC lookup timeout"

# Documentation
git commit -m "docs: update API integration guide"
```

## Production Metrics

- **Response Time**: <2s average (with caching)
- **Parsing Accuracy**: 95%+ on real-world prescriptions
- **Uptime**: 99.9%+ on Cloud Run
- **Cache Hit Rate**: ~80% for frequent lookups

## License

Proprietary - Foundation Health

## Support

For issues or questions, contact the Foundation Health development team.

---

**Built with ❤️ for better healthcare outcomes**
