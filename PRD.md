# NDC Packaging & Quantity Calculator
## Product Requirements Document - Final Specification

**Organization:** Foundation Health  
**Version:** 5.0 - Three-API Architecture  
**Last Updated:** November 11, 2025  
**Target Launch:** 6 weeks from kickoff  
**Status:** Ready for Development

---

## Executive Summary

The **NDC Packaging & Quantity Calculator** uses a three-tier AI-powered architecture to deliver precise prescription fulfillment. OpenAI interprets complex inputs, RxNorm standardizes drug identifiers, and FDA provides authoritative NDC codes—creating a robust system that supports all medication types while maintaining 95%+ accuracy.

**Three-Layer Architecture:**
1. **OpenAI** - Interprets user input (spelling, SIG parsing, calculations)
2. **RxNorm** - Standardizes drug names and provides RxCUI identifiers
3. **FDA NDC** - Retrieves actual product codes and packaging information

**Core Innovation:** Multi-API verification system ensures accuracy through redundancy, with each API serving a distinct purpose and providing fallback capabilities.

**Business Impact:**
- Reduce NDC-related claim rejections by 50%
- Save 3 minutes per prescription (30% time reduction)
- Support all dosage forms from day one
- Achieve 95%+ normalization accuracy
- $1.25M annual savings vs $33K annual cost = 3,716% ROI

---

## Problem Statement

Pharmacists manually process prescriptions with multiple failure points:
- Interpreting misspelled drug names ("metfomin" vs "Metformin")
- Parsing complex SIG instructions across varying formats
- Calculating quantities across different units (tablets vs ml vs insulin units)
- Matching to valid NDCs from thousands of options
- Verifying NDC active status
- Selecting optimal package sizes

**Current Impact:**
- 10% claim rejection rate due to NDC errors
- Inability to handle non-tablet dosage forms consistently
- 8 minutes per complex prescription
- Patient delays and dissatisfaction
- $25-50 cost per claim rejection rework

---

## Success Metrics

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| Normalization accuracy (all forms) | 70% | 95% | Week 8 |
| NDC-related claim rejections | 10% | 5% | Month 3 |
| Time per prescription | 8 min | 5.5 min | Week 8 |
| User satisfaction (NPS) | 3.2/5 | 4.5/5 | Week 8 |
| Tool adoption rate | 0% | 80% | Month 3 |
| RxNorm verification success | N/A | >90% | Week 8 |
| FDA NDC match rate | N/A | >95% | Week 8 |
| System availability | N/A | 99.5% | Ongoing |

---

## Target Users

**Primary Users:**
- Pharmacists at Foundation Health pharmacies
- Pharmacy Technicians

**User Personas:**

**Sarah (Pharmacist, 15 years experience)**
- Processes 50+ prescriptions daily
- Frustrated by claim rejections
- Needs fast, accurate NDC matching
- Values system that "just works"

**Mike (Pharmacy Technician, 3 years experience)**
- Handles prescription entry
- Struggles with complex liquid dosing
- Needs clear guidance on package selection
- Wants to minimize errors

**Pain Points Addressed:**
- ✅ "I can't calculate insulin doses accurately"
- ✅ "Drug name typos break our system"
- ✅ "Complex SIG instructions take too long"
- ✅ "I don't know which package size to dispense"
- ✅ "I accidentally use inactive NDCs"
- ✅ "Unit conversions are confusing"

---

## System Architecture

### High-Level Design

```
┌─────────────────────────────────────────┐
│         User Input (SvelteKit UI)       │
│  • Drug: "metfomin 500"                 │
│  • SIG: "inject 15 units subq daily"   │
│  • Days: 30                             │
└──────────────┬──────────────────────────┘
               │ HTTPS/JSON
               ▼
┌──────────────────────────────────────────┐
│    SvelteKit Backend (API Routes)       │
│    TypeScript + GCP Cloud Run            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  [LAYER 1] OpenAI Normalization Service │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  Role: Universal Interpreter             │
│  • Correct spelling errors               │
│  • Parse complex SIG instructions        │
│  • Calculate total quantity              │
│  • Handle ALL units of measurement       │
│  • Provide confidence scores             │
│                                          │
│  Output: {                               │
│    drug: "Insulin Glargine Injection",  │
│    dosage_form: "injection",            │
│    strength: "100 units/ml",            │
│    quantity: 450 units,                 │
│    confidence: 0.96                     │
│  }                                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  [LAYER 2] RxNorm Verification Service  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  Role: Drug Standardization              │
│  • Validate drug exists in RxNorm       │
│  • Convert to standard RxCUI            │
│  • Get official drug name               │
│  • Boost confidence if verified         │
│                                          │
│  API: RxNorm /approximateTerm            │
│                                          │
│  Output: {                               │
│    rxcui: "274783",                     │
│    name: "Insulin Glargine 100 UNT/ML", │
│    verified: true                       │
│  }                                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│      Validation & Safety Layer           │
│  • Check confidence thresholds           │
│  • Medical reasonableness checks         │
│  • Queue low-confidence for review       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  [LAYER 3] FDA NDC Retrieval Service    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  Role: Product Code Lookup               │
│  • Search by RxCUI (most precise)       │
│  • Fallback: search by drug name        │
│  • Get all package options              │
│  • Filter active/inactive               │
│  • Extract package sizes                │
│                                          │
│  API: FDA /drug/ndc.json                │
│                                          │
│  Output: [                               │
│    {                                     │
│      ndc: "0088-2220-33",               │
│      package_size: 10,                  │
│      package_unit: "ml",                │
│      manufacturer: "Sanofi",            │
│      is_active: true                    │
│    }                                     │
│  ]                                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│      Package Selection Algorithm         │
│  • Calculate optimal package(s)          │
│  • Minimize overfill                     │
│  • Rank alternatives                     │
└──────────────┬──────────────────────────┘
               │
               ▼
         Display Results + Export
            (SvelteKit UI)
```

### Technology Stack

**Frontend:**
- SvelteKit (UI framework)
- TypeScript (strict mode)
- Tailwind CSS (styling)
- Skeleton UI (component library)

**Backend:**
- SvelteKit server routes
- Node.js 20 LTS
- TypeScript (strict mode)

**AI & APIs:**
- OpenAI API (GPT-4o-mini) - Interpretation
- RxNorm API (NIH/NLM) - Standardization  
- FDA NDC Directory API - Product codes

**Database:**
- PostgreSQL 15 (Cloud SQL)
- Prisma ORM (type-safe queries)

**Caching:**
- Redis 7 (Memorystore)
- Multi-layer cache strategy

**Cloud Platform (GCP):**
- Cloud Run (containerized deployment)
- Cloud SQL (managed PostgreSQL)
- Memorystore (managed Redis)
- Cloud Monitoring & Logging
- Secret Manager (API keys)

**CI/CD:**
- GitHub Actions
- Automated testing
- Staging → Production pipeline

---

## Three-API Integration Strategy

### API Roles & Responsibilities

| API | Primary Role | What It Provides | What It Doesn't Have |
|-----|-------------|------------------|---------------------|
| **OpenAI** | Interpretation | Spelling correction, SIG parsing, quantity calculation, unit handling | Drug validation, NDC codes, package info |
| **RxNorm** | Standardization | RxCUI identifiers, drug validation, official names, relationships | NDC codes, package sizes, manufacturers |
| **FDA NDC** | Product Codes | NDC codes, package sizes, manufacturers, active status | Drug interpretation, spelling help |

### Why Three APIs?

**Each API fills a critical gap:**

1. **OpenAI**: Handles the "messy" human input
   - Misspellings, abbreviations, complex instructions
   - AI is flexible and can understand natural language
   
2. **RxNorm**: Provides healthcare standard identifiers
   - RxCUI is used across healthcare systems (EHR, claims)
   - Validates that drug actually exists
   - Enables future integrations
   
3. **FDA**: Authoritative source for NDC codes
   - Official government database
   - Actual product codes pharmacies need
   - Package sizes and manufacturer info

**Together**: Create a robust system with multiple verification layers and fallback capabilities.

---

## Functional Requirements

### FR-1: OpenAI-Powered Universal Interpretation

**Purpose:** Handle all interpretive work—spelling correction, SIG parsing, quantity calculation across all units.

**Input:** 
- Drug name (with potential misspellings)
- SIG (free-text instructions)
- Days supply (1-90)

**Process:**
1. Hash input for cache lookup
2. Check Redis cache (7-day TTL)
3. If miss, call OpenAI with comprehensive prompt
4. Parse and validate JSON response
5. Cache result
6. Log for monitoring

**AI Configuration:**
- Model: `gpt-4o-mini`
- Temperature: 0.1 (consistent output)
- Max tokens: 500
- Timeout: 30 seconds
- Retry: 3 attempts with backoff

**Comprehensive Prompt:**
```
You are a pharmacy AI assistant. Parse this prescription into structured data.

INPUT:
Drug: "${drugName}"
SIG: "${sig}"
Days Supply: ${daysSupply}

TASKS:
1. Correct any spelling errors in the drug name
2. Identify the exact drug with strength and dosage form
3. Parse the SIG into structured dosing instructions
4. Handle ANY unit of measurement (tablets, ml, units, actuations, patches, etc.)
5. Calculate total quantity needed
6. Provide confidence scores and warnings

OUTPUT (Return ONLY valid JSON, no markdown):
{
  "drug": {
    "corrected_name": "exact drug name with strength",
    "original_name": "what user typed",
    "dosage_form": "tablet|capsule|solution|injection|inhaler|patch|etc",
    "strength": "500mg|100units/ml|90mcg/actuation|etc",
    "confidence": 0.95,
    "spelling_corrected": true|false
  },
  "parsed_sig": {
    "dose_per_administration": 10,
    "dose_unit": "ml|tablet|unit|actuation|gram|patch|puff",
    "frequency_per_day": 2,
    "route": "oral|injection|inhalation|topical|etc",
    "duration_days": 30,
    "special_instructions": "with food|shake well|refrigerate",
    "is_prn": false,
    "is_taper": false,
    "confidence": 0.90
  },
  "calculation": {
    "total_quantity": 600,
    "unit": "ml",
    "formula": "10ml × 2 times/day × 30 days = 600ml"
  },
  "warnings": ["warning messages if any"],
  "overall_confidence": 0.92
}

[Include 6-8 diverse examples: tablets, insulin, liquids, inhalers, tapers, patches]

Now process the user's input above.
```

**Output Example:**
```json
{
  "drug": {
    "corrected_name": "Insulin Glargine (Lantus) Injection",
    "original_name": "lantis",
    "dosage_form": "injection",
    "strength": "100 units/ml",
    "confidence": 0.94,
    "spelling_corrected": true
  },
  "parsed_sig": {
    "dose_per_administration": 15,
    "dose_unit": "unit",
    "frequency_per_day": 1,
    "route": "subcutaneous",
    "duration_days": 30,
    "is_prn": false,
    "confidence": 0.96
  },
  "calculation": {
    "total_quantity": 450,
    "unit": "unit",
    "formula": "15 units × 1 time/day × 30 days = 450 units"
  },
  "warnings": [],
  "overall_confidence": 0.95
}
```

**Performance:**
- Cached: <100ms
- Uncached: <2 seconds
- 95%+ accuracy target

**Cost:**
- Per calculation: ~$0.0003
- 10,000/month: ~$3
- 100,000/month: ~$30

**Error Handling:**
- Timeout: Retry 3 times
- Invalid JSON: Log and prompt manual entry
- Low confidence: Queue for manual review
- API down: Fallback to manual input form

---

### FR-2: RxNorm Drug Verification

**Purpose:** Validate drug exists and obtain standard RxCUI identifier for precise FDA searches.

**Input:** AI-normalized drug information
- Corrected drug name
- Dosage form
- Strength

**Process:**
1. Build search term from AI output
2. Check Redis cache (30-day TTL for RxCUI mappings)
3. Call RxNorm `/approximateTerm` API
4. Filter to prescribable drugs (SCD/SBD types)
5. If multiple matches, select best match by strength
6. Return RxCUI and standardized name
7. Cache result

**API Endpoint:**
```
https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term={drug_name}&maxEntries=10
```

**Rate Limits:**
- 20 requests/second
- No API key required
- Free to use

**Search Strategy:**
```typescript
// Simple search with drug name
const term = "Metformin 500mg Tablet";

// RxNorm handles variations internally
// Returns closest matches with RxCUI
```

**Response Processing:**
```typescript
interface RxNormResult {
  rxcui: string;          // e.g., "860975"
  name: string;           // e.g., "Metformin Hydrochloride 500 MG Oral Tablet"
  synonym?: string;
  tty: string;            // SCD (Semantic Clinical Drug) or SBD (Branded)
}

// Filter to only prescribable types
const prescribable = results.filter(r => ['SCD', 'SBD'].includes(r.tty));
```

**Output:**
```json
{
  "rxcui": "860975",
  "name": "Metformin Hydrochloride 500 MG Oral Tablet",
  "tty": "SCD",
  "verified": true
}
```

**Confidence Boost:**
```typescript
if (rxNormResult?.rxcui) {
  aiResult.overall_confidence = Math.min(0.99, aiResult.overall_confidence + 0.03);
  aiResult.drug.rxcui = rxNormResult.rxcui;
  aiResult.drug.standardized_name = rxNormResult.name;
}
```

**Fallback Strategy:**
- If RxNorm fails: Continue without RxCUI
- FDA will search by drug name instead
- Log warning for monitoring
- Don't fail entire process

**Performance:**
- Cached: <50ms
- Uncached: <1 second
- Optional step (graceful degradation)

---

### FR-3: FDA NDC Retrieval

**Purpose:** Get actual NDC codes, package sizes, and manufacturer information.

**Input:**
- RxCUI (from RxNorm, if available)
- Drug name (fallback)
- Dosage form
- Strength

**Process:**
1. Build search query (prefer RxCUI, fallback to name)
2. Check Redis cache (12-hour TTL)
3. Call FDA NDC API
4. Filter to finished products only
5. Parse package descriptions
6. Determine active/inactive status
7. Sort by package size descending
8. Cache results

**API Endpoint:**
```
https://api.fda.gov/drug/ndc.json
```

**Authentication:**
- Free, no key required for basic usage
- Optional API key for higher limits (recommended)

**Rate Limits:**
- Without key: 240/min, 1,000/day
- With key: 240/min, 120,000/day
- **Action:** Request free API key

**Search Strategy (Two Modes):**

**Mode 1: Search by RxCUI (Preferred)**
```
search=openfda.rxcui:"860975"+AND+finished:true&limit=100
```
- Most precise
- Gets all products for exact drug
- Recommended when RxCUI available

**Mode 2: Search by Name (Fallback)**
```
search=(brand_name:"Metformin"+OR+generic_name:"Metformin")+AND+dosage_form:"TABLET"+AND+active_ingredients.strength:"500mg/1"+AND+finished:true&limit=100
```
- Works without RxCUI
- May miss some products due to name variations
- Still effective for most searches

**Response Structure:**
```json
{
  "results": [
    {
      "product_ndc": "0781-1506",
      "generic_name": "METFORMIN HYDROCHLORIDE",
      "dosage_form": "TABLET",
      "active_ingredients": [
        {"name": "METFORMIN HYDROCHLORIDE", "strength": "500mg/1"}
      ],
      "packaging": [
        {
          "package_ndc": "0781-1506-10",
          "description": "100 TABLET in 1 BOTTLE",
          "marketing_start_date": "20140101"
        },
        {
          "package_ndc": "0781-1506-01",
          "description": "30 TABLET in 1 BOTTLE",
          "marketing_start_date": "20140101"
        }
      ],
      "labeler_name": "SANDOZ INC",
      "finished": true,
      "listing_expiration_date": "20251231"
    }
  ]
}
```

**Package Description Parsing:**
```typescript
function parsePackageSize(description: string): {size: number; unit: string} | null {
  // "100 TABLET in 1 BOTTLE" → {size: 100, unit: "tablet"}
  // "200 mL in 1 BOTTLE" → {size: 200, unit: "ml"}
  // "200 metered sprays" → {size: 200, unit: "actuation"}
  
  // Standard pattern
  const match = description.match(/^(\d+\.?\d*)\s+([A-Z]+)/i);
  if (match) {
    return {
      size: parseFloat(match[1]),
      unit: normalizeUnit(match[2])
    };
  }
  
  // Inhaler pattern
  if (description.includes('metered spray')) {
    const sprayMatch = description.match(/(\d+)\s+metered\s+spray/i);
    if (sprayMatch) {
      return {size: parseInt(sprayMatch[1]), unit: 'actuation'};
    }
  }
  
  return null;
}
```

**Active/Inactive Determination:**
```typescript
function isNDCActive(product: FDAProduct): boolean {
  // Must be finished product
  if (product.finished !== true) return false;
  
  // Check expiration date
  if (product.listing_expiration_date) {
    const expDate = new Date(product.listing_expiration_date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (expDate < oneYearAgo) return false; // Expired >1 year
  }
  
  // Must have valid packaging
  return product.packaging?.some(pkg => 
    pkg.sample === false && pkg.marketing_start_date
  ) ?? false;
}
```

**Output:**
```json
[
  {
    "ndc": "0781-1506-10",
    "productNDC": "0781-1506",
    "packageSize": 100,
    "packageUnit": "tablet",
    "description": "100 TABLET in 1 BOTTLE",
    "manufacturer": "SANDOZ INC",
    "isActive": true,
    "expirationDate": "2025-12-31"
  },
  {
    "ndc": "0781-1506-01",
    "packageSize": 30,
    "packageUnit": "tablet",
    "isActive": true,
    "manufacturer": "SANDOZ INC"
  }
]
```

**Dosage Form Mapping:**
```typescript
// AI returns lowercase, FDA expects uppercase
const formMapping: Record<string, string> = {
  'tablet': 'TABLET',
  'capsule': 'CAPSULE',
  'solution': 'SOLUTION',
  'injection': 'INJECTION',
  'inhaler': 'AEROSOL',
  'patch': 'PATCH'
};
```

**Error Handling:**
- Timeout: Retry 3 times with exponential backoff
- Rate limit: Wait and retry with backoff
- No results: Show message, suggest checking spelling
- API down: Use cached data with warning

**Performance:**
- Cached: <100ms
- Uncached: <1.5 seconds
- Circuit breaker after 5 failures

---

### FR-4: Validation & Safety Layer

**Purpose:** Ensure medical reasonableness and identify calculations requiring manual review.

**Confidence Thresholds:**

| Score | Action | UI Display |
|-------|--------|-----------|
| >0.85 | Auto-approve | ✅ Green "High Confidence" |
| 0.70-0.85 | Show warning, allow | ⚠️ Yellow "Review Recommended" |
| <0.70 | Queue for manual review | 🚫 Red "Manual Review Required" |

**Medical Reasonableness Checks:**

```typescript
class ValidationService {
  validate(data: {ai: AIResult; rxnorm: RxNormResult; fda: NDCPackage[]}) {
    const errors: string[] = [];
    const warnings: string[] = [...data.ai.warnings];
    
    // Confidence checks
    if (data.ai.overall_confidence < 0.70) {
      errors.push('Confidence too low - manual review required');
    } else if (data.ai.overall_confidence < 0.85) {
      warnings.push('Lower confidence - pharmacist verification recommended');
    }
    
    // Frequency checks
    if (data.ai.parsed_sig.frequency_per_day > 6 && !data.ai.parsed_sig.is_prn) {
      warnings.push('High frequency (>6x daily) - verify with prescriber');
    }
    
    if (data.ai.parsed_sig.frequency_per_day > 12) {
      errors.push('Excessive frequency (>12x daily) - manual review required');
    }
    
    // Quantity reasonableness by unit
    const maxQuantities = {
      'tablet': 1000,
      'capsule': 1000,
      'ml': 5000,
      'unit': 2000,    // Insulin
      'actuation': 500, // Inhalers
      'patch': 90,
      'gram': 500
    };
    
    const max = maxQuantities[data.ai.calculation.unit] || 1000;
    if (data.ai.calculation.total_quantity > max) {
      warnings.push(`Large quantity (${data.ai.calculation.total_quantity} ${data.ai.calculation.unit})`);
    }
    
    // Unit compatibility with dosage form
    if (this.detectUnitMismatch(data.ai)) {
      errors.push('Unit incompatible with dosage form');
    }
    
    // RxNorm verification bonus
    if (!data.rxnorm?.rxcui) {
      warnings.push('Drug not verified in RxNorm database');
    }
    
    // FDA match check
    if (data.fda.length === 0) {
      errors.push('No matching NDCs found');
    }
    
    // Insulin-specific
    if (data.ai.calculation.unit === 'unit' && data.ai.calculation.total_quantity > 1500) {
      warnings.push('High insulin dose - verify with prescriber');
    }
    
    return {
      isValid: errors.length === 0,
      requiresManualReview: data.ai.overall_confidence < 0.85 || errors.length > 0,
      errors,
      warnings,
      finalConfidence: this.calculateFinalConfidence(data)
    };
  }
  
  private calculateFinalConfidence(data: any): number {
    let confidence = data.ai.overall_confidence;
    
    // Boost for RxNorm verification
    if (data.rxnorm?.rxcui) {
      confidence += 0.03;
    }
    
    // Boost for successful FDA match
    if (data.fda.length > 0) {
      confidence += 0.02;
    }
    
    // Cap at 0.99
    return Math.min(0.99, confidence);
  }
  
  private detectUnitMismatch(ai: AIResult): boolean {
    const validUnits: Record<string, string[]> = {
      'tablet': ['tablet', 'capsule'],
      'capsule': ['tablet', 'capsule'],
      'solution': ['ml'],
      'injection': ['ml', 'unit'],
      'inhaler': ['actuation', 'puff'],
      'patch': ['patch']
    };
    
    const expected = validUnits[ai.drug.dosage_form] || [];
    return expected.length > 0 && !expected.includes(ai.calculation.unit);
  }
}
```

**Manual Review Queue:**
- Automatically queued if confidence <0.85 or validation errors
- Pharmacist reviews in admin dashboard
- Can approve, reject, or modify calculation
- All reviews logged for audit

---

### FR-5: Package Selection Algorithm

**Purpose:** Select optimal NDC package(s) to meet quantity with minimal overfill.

**Algorithm: Greedy with Multi-Pack**

```typescript
function selectOptimalPackages(
  requiredQty: number,
  unit: string,
  availablePackages: NDCPackage[]
): PackageRecommendation {
  
  // Filter to matching units
  const matchingPackages = availablePackages.filter(p => p.packageUnit === unit);
  
  // Sort by size descending
  matchingPackages.sort((a, b) => b.packageSize - a.packageSize);
  
  // Try to find exact match
  const exactMatch = matchingPackages.find(p => p.packageSize === requiredQty);
  if (exactMatch) {
    return {
      packages: [{...exactMatch, quantity: 1}],
      totalUnits: requiredQty,
      overfillPct: 0,
      badge: 'perfect_match'
    };
  }
  
  // Try single package (may have overfill)
  const singlePackage = matchingPackages.find(p => p.packageSize >= requiredQty);
  if (singlePackage) {
    const overfill = singlePackage.packageSize - requiredQty;
    const overfillPct = (overfill / requiredQty) * 100;
    
    if (overfillPct <= 10) {
      return {
        packages: [{...singlePackage, quantity: 1}],
        totalUnits: singlePackage.packageSize,
        overfillPct,
        badge: 'optimal'
      };
    }
  }
  
  // Try 2-pack combinations
  const bestCombo = findBestTwoPackCombo(requiredQty, matchingPackages);
  
  // Compare single vs combo
  const options = [
    singlePackage && createSingleOption(singlePackage, requiredQty),
    bestCombo
  ].filter(Boolean);
  
  // Rank by overfill percentage
  options.sort((a, b) => a.overfillPct - b.overfillPct);
  
  return options[0] || {
    packages: [],
    totalUnits: 0,
    overfillPct: 0,
    badge: 'no_match',
    error: 'No suitable packages found'
  };
}

function findBestTwoPackCombo(requiredQty: number, packages: NDCPackage[]) {
  let bestCombo = null;
  let bestOverfill = Infinity;
  
  for (let i = 0; i < packages.length; i++) {
    for (let j = i; j < packages.length; j++) {
      const pkg1 = packages[i];
      const pkg2 = packages[j];
      
      // Try different quantities
      for (let qty1 = 1; qty1 <= 3; qty1++) {
        for (let qty2 = 0; qty2 <= 3; qty2++) {
          const total = (pkg1.packageSize * qty1) + (pkg2.packageSize * qty2);
          
          if (total >= requiredQty) {
            const overfill = total - requiredQty;
            const overfillPct = (overfill / requiredQty) * 100;
            
            if (overfillPct < bestOverfill) {
              bestOverfill = overfillPct;
              bestCombo = {
                packages: [
                  {...pkg1, quantity: qty1},
                  qty2 > 0 ? {...pkg2, quantity: qty2} : null
                ].filter(Boolean),
                totalUnits: total,
                overfillPct
              };
            }
          }
        }
      }
    }
  }
  
  return bestCombo;
}
```

**Overfill Tolerance:**

| Overfill % | Badge | Color | Action |
|-----------|-------|-------|--------|
| 0% | "Perfect Match" | Green | Auto-select |
| 1-10% | "Optimal" | Green | Auto-select |
| 11-20% | "Acceptable" | Yellow | Show warning |
| 21-30% | "High Overfill" | Orange | Suggest alternatives |
| >30% | "Excessive" | Red | Require confirmation |

**Output Format:**
```json
{
  "recommended": {
    "packages": [
      {
        "ndc": "0781-1506-10",
        "packageSize": 100,
        "quantity": 1,
        "manufacturer": "SANDOZ INC",
        "isActive": true
      }
    ],
    "totalUnits": 100,
    "requiredUnits": 90,
    "overfillUnits": 10,
    "overfillPct": 11.1,
    "badge": "acceptable",
    "badgeColor": "yellow"
  },
  "alternatives": [
    {
      "packages": [
        {"ndc": "0781-1506-01", "packageSize": 30, "quantity": 3}
      ],
      "totalUnits": 90,
      "overfillPct": 0,
      "badge": "perfect_match"
    }
  ]
}
```

---

### FR-6: Inactive NDC Handling

**Detection:** Based on FDA `listing_expiration_date` and `finished` status

**Display:**
- Red "INACTIVE" badge
- Warning icon
- Last verified date
- Discontinued since date

**Behavior:**
- Allow selection with prominent warning
- Log selection in audit trail
- Require acknowledgment checkbox

**Warning Message:**
```
⚠️ WARNING: Inactive NDC

This NDC was discontinued on {date}. The product may no longer be 
manufactured or distributed.

Action Required:
□ I have verified this product is available in our inventory
□ I understand this is an inactive NDC code

Selecting an inactive NDC will be logged for quality assurance.
```

**Alternative Suggestions:**
- Show 3 active alternatives
- Highlight same drug/strength/manufacturer if available
- One-click switch to alternative

---

### FR-7: Output & Export

**Complete Response Structure:**
```json
{
  "success": true,
  "data": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-11-11T15:30:00Z",
    
    "input": {
      "drug_name": "metfomin 500",
      "sig": "take 1 tab BID",
      "days_supply": 30,
      "user_id": "user-uuid"
    },
    
    "layer1_ai_interpretation": {
      "drug": {
        "corrected_name": "Metformin 500mg Tablet",
        "original_name": "metfomin 500",
        "dosage_form": "tablet",
        "strength": "500mg",
        "confidence": 0.98,
        "spelling_corrected": true
      },
      "parsed_sig": {
        "dose_per_administration": 1,
        "dose_unit": "tablet",
        "frequency_per_day": 2,
        "route": "oral",
        "duration_days": 30,
        "confidence": 0.96
      },
      "calculation": {
        "total_quantity": 60,
        "unit": "tablet",
        "formula": "1 tablet × 2 times/day × 30 days = 60 tablets"
      },
      "warnings": [],
      "overall_confidence": 0.97
    },
    
    "layer2_rxnorm_verification": {
      "rxcui": "860975",
      "standardized_name": "Metformin Hydrochloride 500 MG Oral Tablet",
      "tty": "SCD",
      "verified": true,
      "confidence_boost": 0.03
    },
    
    "layer3_fda_ndc_lookup": {
      "search_method": "rxcui",
      "rxcui_used": "860975",
      "total_ndcs_found": 47,
      "active_ndcs": 42,
      "inactive_ndcs": 5
    },
    
    "validation": {
      "is_valid": true,
      "requires_manual_review": false,
      "final_confidence": 1.00,
      "errors": [],
      "warnings": ["Spelling was corrected: metfomin → Metformin"]
    },
    
    "ndc_recommendations": {
      "recommended": {
        "packages": [{...}],
        "totalUnits": 60,
        "overfillPct": 0,
        "badge": "perfect_match"
      },
      "alternatives": [{...}]
    },
    
    "metadata": {
      "processing_time_ms": 2143,
      "api_calls": {
        "openai": {"cached": false, "cost_usd": 0.0003, "latency_ms": 1456},
        "rxnorm": {"cached": false, "latency_ms": 287},
        "fda": {"cached": true, "latency_ms": 45}
      },
      "cache_stats": {
        "ai_cache_hit": false,
        "rxnorm_cache_hit": false,
        "fda_cache_hit": true
      }
    }
  }
}
```

**Export Formats:**
- **JSON:** Full response for integration
- **CSV:** NDC table with package details
- **PDF:** Printable calculation summary

---

## Non-Functional Requirements

### Performance

**Response Time Targets:**
- Page load: <1 second
- End-to-end calculation: <3 seconds (95th percentile)
- Breakdown:
  - OpenAI: <2 seconds (uncached)
  - RxNorm: <1 second
  - FDA: <1.5 seconds (uncached)
  - Processing: <500ms

**Caching Strategy:**
```
Redis Multi-Layer Cache:
- ai:{input_hash} → AI result (7 days)
- rxnorm:{drug_name} → RxCUI (30 days)
- fda:{rxcui} → NDC list (12 hours)
- fda:{name}:{form}:{strength} → NDC list (12 hours)

Cache Hit Rate Target: >60%
```

**Scalability:**
- Support 50 concurrent users initially
- Auto-scale to 200+ concurrent users
- Stateless architecture for horizontal scaling

### Reliability

**Uptime:** 99.5% during business hours (6 AM - 10 PM ET)

**Error Recovery:**
- API retries: 3 attempts with exponential backoff
- Circuit breakers: Open after 5 consecutive failures
- Graceful degradation:
  - RxNorm down → Continue without RxCUI
  - FDA down → Use cached data (show warning)
  - OpenAI down → Prompt manual entry

**Multi-API Fallback Chain:**
```
1. Try full 3-API workflow (OpenAI → RxNorm → FDA)
2. If RxNorm fails → Skip verification, use AI name for FDA
3. If FDA by RxCUI fails → Retry FDA by drug name
4. If FDA completely fails → Use cached FDA data
5. If OpenAI fails → Offer manual structured input form
```

### Security & Compliance

**HIPAA Compliance:**
- Treat SIG as Protected Health Information
- Encrypt all data: AES-256 at rest, TLS 1.3 in transit
- Audit log all access with user ID and timestamp
- Business Associate Agreements: OpenAI, GCP
- 7-year retention for audit logs

**Authentication:**
- Firebase Auth (email/password)
- Password requirements: 12+ characters, complexity
- MFA for admin accounts
- Session timeout: 30 minutes inactivity

**Authorization (RBAC):**
- Admin: Full access, user management, review queue
- Pharmacist: All features, view audit logs, flag items
- Technician: Calculate, view own history

**API Security:**
- API keys in Google Secret Manager
- CORS whitelist: foundation-health.com only
- CSRF protection on mutating endpoints
- Rate limiting: 100 req/min per user
- Input sanitization on all fields

### Observability

**Structured Logging:**
```json
{
  "timestamp": "2025-11-11T15:30:00Z",
  "level": "INFO",
  "service": "calculator",
  "correlation_id": "550e8400-...",
  "user_id": "user-123",
  "event": "calculation_completed",
  "data": {
    "drug": "Metformin",
    "confidence": 0.97,
    "apis_called": ["openai", "rxnorm", "fda"],
    "processing_time_ms": 2143,
    "cache_hits": ["fda"]
  }
}
```

**Custom Metrics:**
- `calculation_total` (counter)
- `calculation_duration_ms` (histogram)
- `api_latency_{service}` (histogram)
- `api_error_rate_{service}` (gauge)
- `confidence_score` (histogram)
- `cache_hit_rate` (gauge)
- `manual_review_queue_depth` (gauge)
- `rxnorm_verification_rate` (gauge)
- `fda_match_rate` (gauge)

**Dashboards:**
1. **System Health**: Request rates, errors, latency, API health
2. **AI Performance**: Confidence distribution, review rate, cost
3. **API Integration**: Success rates, latency, fallback usage
4. **Business Metrics**: Calculations/day, adoption, time savings

**Alerts (PagerDuty):**
- Error rate >5% for 5 minutes
- Any API p95 latency >5 seconds
- OpenAI API failures >10 in 5 minutes
- Manual review queue >20 items
- Daily OpenAI cost >$50

---

## Data Models

### PostgreSQL Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'pharmacist', 'technician')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Calculation Audit
CREATE TABLE calculation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  
  -- Input
  input_drug VARCHAR(255),
  input_sig TEXT,
  input_days INT,
  
  -- Layer 1: AI
  ai_corrected_drug VARCHAR(255),
  ai_spelling_corrected BOOLEAN,
  ai_dosage_form VARCHAR(100),
  ai_calculated_qty DECIMAL(10,2),
  ai_unit VARCHAR(50),
  ai_confidence DECIMAL(3,2),
  ai_warnings JSONB,
  
  -- Layer 2: RxNorm
  rxnorm_rxcui VARCHAR(50),
  rxnorm_standardized_name VARCHAR(255),
  rxnorm_verified BOOLEAN,
  
  -- Layer 3: FDA
  fda_search_method VARCHAR(20), -- 'rxcui' or 'name'
  fda_ndcs_found INT,
  
  -- Validation
  validation_passed BOOLEAN,
  requires_manual_review BOOLEAN,
  final_confidence DECIMAL(3,2),
  validation_errors JSONB,
  
  -- Selection
  selected_ndc VARCHAR(20),
  selected_package_size INT,
  overfill_pct DECIMAL(5,2),
  ndc_status VARCHAR(20),
  
  -- Metadata
  processing_time_ms INT,
  openai_cost_usd DECIMAL(8,6),
  cache_hits JSONB, -- ["fda", "rxnorm"]
  
  -- Manual review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT
);

-- Manual Review Queue
CREATE TABLE manual_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id UUID REFERENCES calculation_audit(id),
  created_at TIMESTAMP DEFAULT NOW(),
  priority VARCHAR(20) DEFAULT 'normal',
  reason TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

-- API Performance Metrics
CREATE TABLE api_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  service VARCHAR(50), -- 'openai', 'rxnorm', 'fda'
  endpoint VARCHAR(255),
  latency_ms INT,
  success BOOLEAN,
  error_message TEXT,
  cached BOOLEAN
);

-- Indexes
CREATE INDEX idx_audit_user_time ON calculation_audit(user_id, timestamp DESC);
CREATE INDEX idx_audit_review ON calculation_audit(requires_manual_review, timestamp) WHERE requires_manual_review = true;
CREATE INDEX idx_audit_confidence ON calculation_audit(final_confidence);
CREATE INDEX idx_audit_rxnorm ON calculation_audit(rxnorm_rxcui);
CREATE INDEX idx_review_status ON manual_review_queue(status, created_at);
CREATE INDEX idx_metrics_service ON api_metrics(service, timestamp DESC);
```

---

## Implementation Roadmap

### Week 1: Foundation & AI Integration

**Days 1-2: Project Setup**
- Create GCP project, provision resources
- SvelteKit boilerplate with TypeScript
- Configure CI/CD (GitHub Actions)
- Set up development environment
- Firebase Auth configuration

**Days 3-4: OpenAI Service**
- OpenAI SDK integration
- Comprehensive prompt engineering
- Response parsing and validation
- Redis caching layer
- Unit tests

**Day 5: Testing & Refinement**
- Test AI with 50 diverse prescriptions
- Refine prompt based on results
- Implement error handling

**Deliverables:**
- ✅ Working OpenAI service
- ✅ 95%+ accuracy on test cases
- ✅ <2 second response time

---

### Week 2: RxNorm & FDA Integration

**Days 1-2: RxNorm Service**
- RxNorm API integration
- Search and filtering logic
- Caching strategy (30-day TTL)
- Fallback handling
- Unit tests

**Days 3-4: FDA Service**
- FDA API integration
- Two search modes (RxCUI + name)
- Package description parsing
- Active/inactive determination
- Caching strategy (12-hour TTL)
- Unit tests

**Day 5: Integration Testing**
- Test full 3-API workflow
- Test fallback scenarios
- Performance testing
- Circuit breaker validation

**Deliverables:**
- ✅ Working RxNorm service
- ✅ Working FDA service
- ✅ All APIs integrated
- ✅ Fallback chains tested

---

### Week 3: Validation & Package Selection

**Days 1-2: Validation Layer**
- Confidence thresholds
- Medical reasonableness checks
- Final confidence calculation
- Manual review queue logic
- Unit tests

**Days 3-4: Package Selection Algorithm**
- Greedy selection implementation
- Multi-pack combinations
- Overfill calculation
- Alternative ranking
- Unit tests

**Day 5: Database & Audit Logging**
- Prisma schema implementation
- Audit logging for all calculations
- Manual review queue tables
- API metrics collection

**Deliverables:**
- ✅ Complete validation system
- ✅ Optimal package selection
- ✅ Database fully implemented
- ✅ Audit trail operational

---

### Week 4: Frontend UI

**Days 1-2: Core Components**
- Input form with autocomplete
- Loading states and animations
- Error handling UI
- Responsive layout (Skeleton UI)

**Days 3-4: Results Display**
- Three-layer results (AI, RxNorm, FDA)
- Confidence score visualization
- NDC selection table
- Warnings panel
- Package comparison view
- History sidebar

**Day 5: Actions & Export**
- Copy NDC functionality
- Export buttons (JSON, CSV, PDF)
- Manual review flagging
- Keyboard shortcuts
- Accessibility (WCAG 2.1 AA)

**Deliverables:**
- ✅ Complete working UI
- ✅ All features functional
- ✅ Responsive design
- ✅ Accessible

---

### Week 5: Testing & Refinement

**Days 1-2: E2E Testing**
- Playwright test suite
- Critical user flows
- API fallback scenarios
- Error recovery testing

**Days 3-4: QA & User Testing**
- Pharmacist usability testing (3 users)
- Collect feedback
- Bug fixes
- UI/UX refinements
- Performance optimization

**Day 5: Documentation**
- User guide
- Admin guide
- API documentation
- Developer documentation
- Runbook for operations

**Deliverables:**
- ✅ Complete test suite
- ✅ User feedback incorporated
- ✅ All bugs fixed
- ✅ Documentation complete

---

### Week 6: Production Launch

**Days 1-2: Production Hardening**
- Security review
- HIPAA compliance checklist
- Performance optimization
- Monitoring dashboards
- Alert configuration

**Days 3-4: Staging Validation**
- Deploy to staging
- Full regression testing
- Load testing (100 concurrent users)
- Security scanning
- Stakeholder demo

**Day 5: Production Launch**
- Production deployment
- Smoke tests
- Monitor for issues
- Pilot user training (5-10 users)
- Launch announcement

**Deliverables:**
- ✅ Production-ready system
- ✅ All checks passed
- ✅ Monitoring operational
- ✅ Successfully launched

---

### Post-Launch (Weeks 7-8)

**Pilot & Iteration:**
- Monitor pilot pharmacy usage
- Daily check-ins
- Collect feedback
- Bug fixes and improvements
- Weekly metrics review

**Success Criteria:**
- 90%+ user satisfaction
- <3 second avg response time
- 95%+ normalization accuracy
- >90% RxNorm verification rate
- >95% FDA match rate
- <5% manual review rate
- Zero critical bugs

---

## Risk Mitigation

### Risk 1: API Dependency Cascade Failure
**Probability:** Medium | **Impact:** High

**Scenario:** All three APIs down simultaneously

**Mitigation:**
- Independent failure handling for each API
- Fallback chain: RxNorm fails → continue; FDA fails → use cache
- Daily data snapshots for complete offline mode
- Circuit breakers prevent cascade
- Multi-region deployment for resilience
- Monitor API health dashboards
- SLA alerts for all external services

---

### Risk 2: OpenAI Cost Overruns
**Probability:** Low | **Impact:** Medium

**Mitigation:**
- Aggressive caching (7-day TTL, >60% hit rate target)
- Cost monitoring with daily alerts ($50/day budget)
- Monthly cost reviews
- Optimize prompt to reduce tokens
- Consider GPT-3.5-turbo if costs too high
- Cache hit rate monitoring

**Budget:**
- Target: <$30/month (100K calculations)
- Alert at: $50/day
- Circuit breaker at: $100/day

---

### Risk 3: RxNorm/FDA API Unreliability
**Probability:** Medium | **Impact:** Medium

**Mitigation:**
- Circuit breaker pattern for each API
- Graceful degradation (continue without RxNorm)
- 12-30 day caching
- Daily data snapshots as ultimate fallback
- Retry logic with exponential backoff
- Monitor API health constantly

---

### Risk 4: Low AI Accuracy
**Probability:** Low | **Impact:** High

**Mitigation:**
- Extensive prompt testing (200+ prescriptions)
- Confidence thresholds (manual review <0.85)
- Multi-layer verification (AI + RxNorm + FDA)
- Continuous monitoring and prompt refinement
- Pharmacist feedback loop
- A/B testing for prompt improvements

---

### Risk 5: User Adoption Resistance
**Probability:** Medium | **Impact:** High

**Mitigation:**
- Involve pharmacists in design phase
- Comprehensive training program
- Champion users (power users)
- Show time savings with metrics
- Gradual rollout, not forced
- Feedback loops and rapid iteration
- Celebrate early wins

---

## Cost Summary

### Development Costs (One-Time)

| Item | Cost |
|------|------|
| 3 developers × 6 weeks × $75/hr × 40hr | $54,000 |
| 1 QA engineer × 2 weeks × $60/hr × 40hr | $4,800 |
| Pharmacist advisor × 10hr × $100/hr | $1,000 |
| **Total Development** | **$59,800** |

### Monthly Operating Costs

| Item | Monthly Cost |
|------|------|
| GCP Cloud Run | $200-400 |
| Cloud SQL (PostgreSQL) | $100-200 |
| Memorystore (Redis) | $50-100 |
| OpenAI API (10K calc) | $3-10 |
| OpenAI API (100K calc) | $30-100 |
| RxNorm API | Free |
| FDA API | Free (optional key recommended) |
| Cloud Monitoring | $50-100 |
| Firebase Auth | $0-50 |
| **Total (10K calc/month)** | **$403-860** |
| **Total (100K calc/month)** | **$430-990** |

### ROI Calculation

**Annual Savings:**
```
Assumptions:
- 100 pharmacists using tool
- 20 prescriptions per pharmacist per day
- 3 minutes saved per prescription
- $50/hour pharmacist cost
- 250 working days/year

Time saved: 100 × 20 × 3 min × 250 days = 1,500,000 minutes = 25,000 hours
Cost savings: 25,000 hours × $50/hour = $1,250,000/year
```

**Annual Costs:**
```
Development (amortized 3 years): $59,800 / 3 = $19,933/year
Operations (100K calc/month): $990 × 12 = $11,880/year
Total: $31,813/year
```

**ROI:**
```
($1,250,000 - $31,813) / $31,813 = 3,729% ROI
Net savings: $1,218,187/year
Payback period: 0.025 years (9 days)
```

---

## Appendix

### A. API Quick Reference

**OpenAI API**
- Model: `gpt-4o-mini`
- Cost: ~$0.0003/calculation
- Timeout: 30 seconds
- Cache: 7 days

**RxNorm API**
- Endpoint: `https://rxnav.nlm.nih.gov/REST/approximateTerm.json`
- Cost: Free
- Rate limit: 20/second
- Timeout: 5 seconds
- Cache: 30 days

**FDA NDC API**
- Endpoint: `https://api.fda.gov/drug/ndc.json`
- Cost: Free
- Rate limit: 240/min (1,000/day without key, 120,000/day with key)
- Timeout: 10 seconds
- Cache: 12 hours

### B. Dosage Form Mappings

AI output → FDA API format:
```
tablet → TABLET
capsule → CAPSULE
solution → SOLUTION
suspension → SUSPENSION
injection → INJECTION
inhaler → AEROSOL
patch → PATCH
cream → CREAM
ointment → OINTMENT
```

### C. Common Test Cases

1. Simple tablet: Metformin 500mg, 1 tab BID, 30 days
2. Misspelled drug: "metfomin" → Metformin
3. Insulin: Lantus, 15 units subq daily, 30 days
4. Liquid: Amoxicillin suspension, 10ml TID, 10 days
5. Inhaler PRN: Albuterol HFA, 2 puffs q4-6h prn
6. Taper: Prednisone, start 40mg, decrease 10mg q3d
7. Patch: Lidocaine patch, apply daily for 12 hours
8. Complex SIG: "Take 2 tablets by mouth twice daily with food for 14 days"

### D. Confidence Score Interpretation

| Score | Meaning | Action |
|-------|---------|--------|
| 0.95-1.00 | Very high | Auto-approve |
| 0.85-0.94 | High | Auto-approve, log |
| 0.70-0.84 | Medium | Show warning |
| 0.50-0.69 | Low | Manual review |
| <0.50 | Very low | Block, require manual entry |

### E. Support & Training

**Technical Support:**
- Email: support@foundation-health.com
- Slack: #ndc-calculator-support
- On-call: PagerDuty escalation

**Training Resources:**
- Video tutorials: internal.foundation-health.com/training
- User guide: docs.foundation-health.com
- Live training sessions: Weekly for first month

---

**Document End**

*This PRD represents a production-ready specification for a three-tier AI-powered NDC calculator that leverages OpenAI for interpretation, RxNorm for standardization, and FDA for authoritative product codes—delivering superior accuracy, comprehensive fallback capabilities, and healthcare-standard identifiers.*