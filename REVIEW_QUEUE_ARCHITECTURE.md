# Manual Review Queue - System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESCRIPTION INPUT                           │
│                      (User submits prescription)                     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   TASK 5: VALIDATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  1. Parse prescription with OpenAI                           │   │
│  │  2. Calculate confidence score                               │   │
│  │  3. IF confidence < 0.8 THEN:                               │   │
│  │     a. Create calculation_audit entry                        │   │
│  │     b. Create manual_review_queue item                       │   │
│  │     c. Set priority based on confidence                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│               TASK 10: DATABASE (manual_review_queue)                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  id: "queue-123"                                             │   │
│  │  calculation_id: "calc-456"                                  │   │
│  │  assigned_to: null                                           │   │
│  │  priority: "medium" (based on confidence)                    │   │
│  │  status: "pending"                                           │   │
│  │  notes: null                                                 │   │
│  │  created_at: timestamp                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│            TASK 12: REVIEW QUEUE UI (Pharmacist Interface)           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              /review-queue (Dashboard)                      │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │  GET /api/review-queue?status=pending                 │  │    │
│  │  │                                                        │  │    │
│  │  │  ┌──────────┬──────────┬──────────┬──────────────┐   │  │    │
│  │  │  │ Priority │  Status  │  Script  │  Confidence  │   │  │    │
│  │  │  ├──────────┼──────────┼──────────┼──────────────┤   │  │    │
│  │  │  │  High    │ Pending  │ Metfor.. │    65%       │   │  │    │
│  │  │  │  Medium  │ Pending  │ Lisin..  │    72%       │   │  │    │
│  │  │  └──────────┴──────────┴──────────┴──────────────┘   │  │    │
│  │  │                                                        │  │    │
│  │  │  Filters: [Status▼] [Priority▼] [☐ Unassigned]      │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                           │                                          │
│                           │ Click "Review"                           │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │         /review-queue/[id] (Detail Page)                   │    │
│  │                                                             │    │
│  │  ┌──────────────────────┐  ┌─────────────────────────┐   │    │
│  │  │  PRESCRIPTION DETAILS │  │  REVIEW ACTIONS         │   │    │
│  │  │  ─────────────────────│  │  ───────────────        │   │    │
│  │  │  Original Text:       │  │  [Assign to Me]         │   │    │
│  │  │  "Metformin 500mg..." │  │                          │   │    │
│  │  │                       │  │  [✓ Approve]            │   │    │
│  │  │  Parsed:              │  │  [✗ Reject]             │   │    │
│  │  │  • Drug: Metformin    │  │  [⏸ Defer]              │   │    │
│  │  │  • Strength: 500mg    │  │                          │   │    │
│  │  │  • Form: tablet       │  └─────────────────────────┘   │    │
│  │  │  • Qty: 90            │                                 │    │
│  │  │  • Confidence: 65%    │                                 │    │
│  │  │                       │                                 │    │
│  │  │  RxCUI: 860975       │                                 │    │
│  │  │  NDC: 00093-7214-01  │                                 │    │
│  │  └──────────────────────┘                                 │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────────┘
                          │
                          │ Pharmacist Takes Action
                          │
              ┌───────────┴────────────┬────────────────┐
              │                        │                 │
              ▼                        ▼                 ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐
    │    APPROVE      │    │     REJECT      │    │    DEFER     │
    └────────┬────────┘    └────────┬────────┘    └──────┬───────┘
             │                      │                      │
             ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS                                   │
│                                                                      │
│  POST /api/review-queue/[id]/approve                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  1. Update calculation_audit status → "approved"             │  │
│  │  2. Update review_queue status → "completed"                 │  │
│  │  3. Add approval notes                                        │  │
│  │  4. Log action to audit service                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  POST /api/review-queue/[id]/reject                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  1. Update calculation_audit status → "rejected"             │  │
│  │  2. Update review_queue status → "completed"                 │  │
│  │  3. Add rejection reason to notes                            │  │
│  │  4. Log action with reason to audit service                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  POST /api/review-queue/[id]/notes                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  1. Append notes to review_queue item                        │  │
│  │  2. Status remains "in_review"                               │  │
│  │  3. Log notes addition to audit service                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              TASK 11: AUDIT LOGGING SERVICE                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Event: review_approved                                      │  │
│  │  Metadata:                                                   │  │
│  │    - reviewQueueId: "queue-123"                             │  │
│  │    - calculationId: "calc-456"                              │  │
│  │    - userId: "pharmacist-789"                               │  │
│  │    - timestamp: "2025-11-12T08:00:00Z"                      │  │
│  │    - notes: "Verified medication details"                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
src/
├── lib/
│   ├── components/
│   │   └── review/
│   │       ├── QueueList.svelte          ← Table of queue items
│   │       ├── QueueFilters.svelte       ← Filter controls
│   │       ├── ReviewDetail.svelte       ← Prescription details
│   │       ├── ReviewActions.svelte      ← Action buttons
│   │       └── index.ts                  ← Exports
│   │
│   ├── types/
│   │   └── review.ts                     ← TypeScript interfaces
│   │
│   ├── db/
│   │   ├── schema.ts                     ← Database schema (Task 10)
│   │   └── services/
│   │       └── manualReviewQueue.ts      ← CRUD operations (Task 10)
│   │
│   ├── services/
│   │   └── audit.ts                      ← Audit logging (Task 11)
│   │
│   └── test/
│       └── reviewQueueTest.ts            ← Test suite
│
└── routes/
    ├── api/
    │   └── review-queue/
    │       ├── +server.ts                ← GET /api/review-queue (list)
    │       ├── [id]/
    │       │   ├── +server.ts            ← GET /api/review-queue/[id]
    │       │   ├── assign/
    │       │   │   └── +server.ts        ← POST .../assign
    │       │   ├── approve/
    │       │   │   └── +server.ts        ← POST .../approve
    │       │   ├── reject/
    │       │   │   └── +server.ts        ← POST .../reject
    │       │   └── notes/
    │       │       └── +server.ts        ← POST .../notes
    │       └── next/
    │           └── +server.ts            ← GET .../next
    │
    └── review-queue/
        ├── +page.svelte                  ← Dashboard page
        └── [id]/
            └── +page.svelte              ← Detail page
```

## Data Flow

### 1. Queue Item Creation

```
Prescription Input
      ↓
OpenAI Parsing (confidence: 0.65)
      ↓
ValidationService.validate()
      ↓
IF confidence < 0.8:
      ↓
┌─────────────────────────────────────┐
│ createCalculationAudit({            │
│   prescriptionText: "...",          │
│   parsedResult: {...},              │
│   confidenceScore: 0.65,            │
│   status: "pending"                 │
│ })                                  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ createReviewQueueItem({             │
│   calculationId: audit.id,          │
│   priority: "medium",               │
│   status: "pending"                 │
│ })                                  │
└─────────────────────────────────────┘
```

### 2. Review Process

```
Pharmacist → /review-queue
      ↓
GET /api/review-queue?status=pending
      ↓
┌────────────────────────────────────┐
│ listPendingReviewQueueItems()     │
│   .leftJoin(calculationAudits)    │
│   .leftJoin(users)                │
│   .orderBy(priority, createdAt)   │
└───────────────┬────────────────────┘
                ↓
        Render QueueList
                ↓
      Click "Review" on item
                ↓
GET /api/review-queue/[id]
                ↓
┌────────────────────────────────────┐
│ getReviewQueueItemWithDetails(id) │
│   Returns: {                       │
│     reviewQueueItem,               │
│     calculationAudit,              │
│     assignedUser                   │
│   }                                │
└───────────────┬────────────────────┘
                ↓
     Render ReviewDetail + ReviewActions
                ↓
      Pharmacist clicks "Assign to Me"
                ↓
POST /api/review-queue/[id]/assign
                ↓
┌────────────────────────────────────┐
│ assignReviewQueueItem(id, userId) │
│   UPDATE manual_review_queue       │
│   SET assigned_to = userId,        │
│       status = 'in_review'         │
└───────────────┬────────────────────┘
                ↓
┌────────────────────────────────────┐
│ auditService.logEvent({            │
│   eventType: 'review_item_assigned'│
│   metadata: { ... }                │
│ })                                 │
└────────────────────────────────────┘
```

### 3. Approval Flow

```
Pharmacist reviews details
      ↓
Clicks "Approve" button
      ↓
Confirmation dialog
      ↓
Confirms approval
      ↓
POST /api/review-queue/[id]/approve
      ↓
┌────────────────────────────────────┐
│ updateCalculationAuditStatus(      │
│   calculationId, "approved"        │
│ )                                  │
└───────────────┬────────────────────┘
                ↓
┌────────────────────────────────────┐
│ updateReviewQueueItemStatus(       │
│   id, "completed", notes           │
│ )                                  │
└───────────────┬────────────────────┘
                ↓
┌────────────────────────────────────┐
│ auditService.logEvent({            │
│   eventType: 'review_approved',    │
│   metadata: {                      │
│     reviewQueueId: id,             │
│     userId: userId,                │
│     timestamp: now()               │
│   }                                │
│ })                                 │
└───────────────┬────────────────────┘
                ↓
     Redirect to /review-queue
```

### 4. Rejection Flow

```
Pharmacist reviews details
      ↓
Clicks "Reject" button
      ↓
Rejection form appears
      ↓
Enters rejection reason (required)
      ↓
Confirms rejection
      ↓
POST /api/review-queue/[id]/reject
      ↓
┌────────────────────────────────────┐
│ updateCalculationAuditStatus(      │
│   calculationId, "rejected"        │
│ )                                  │
└───────────────┬────────────────────┘
                ↓
┌────────────────────────────────────┐
│ updateReviewQueueItemStatus(       │
│   id, "completed",                 │
│   "[REJECTED] Reason: ..."         │
│ )                                  │
└───────────────┬────────────────────┘
                ↓
┌────────────────────────────────────┐
│ auditService.logEvent({            │
│   eventType: 'review_rejected',    │
│   metadata: {                      │
│     reviewQueueId: id,             │
│     reason: reason,                │
│     userId: userId                 │
│   }                                │
│ })                                 │
└───────────────┬────────────────────┘
                ↓
     Redirect to /review-queue
```

## Database Schema Relationships

```
┌─────────────────────┐
│       users         │
│─────────────────────│
│ id (PK)            │←──────────┐
│ email              │           │
│ role               │           │
│ display_name       │           │
└─────────────────────┘           │
                                  │
                                  │ assigned_to (FK)
                                  │
                      ┌───────────┴──────────────┐
                      │                          │
┌─────────────────────┴─────┐   ┌───────────────┴──────────┐
│  calculation_audits        │   │  manual_review_queue     │
│────────────────────────────│   │──────────────────────────│
│ id (PK)                   │←──│ calculation_id (FK)      │
│ user_id (FK → users)      │   │ id (PK)                  │
│ prescription_text         │   │ assigned_to (FK → users) │
│ parsed_result (JSONB)     │   │ priority (enum)          │
│ confidence_score          │   │ status (enum)            │
│ status (enum)             │   │ notes (text)             │
│ rxcui                     │   │ created_at               │
│ ndc_codes (JSONB)         │   │ updated_at               │
│ processing_time           │   └──────────────────────────┘
│ created_at                │
└───────────────────────────┘

Relationships:
- manual_review_queue.calculation_id → calculation_audits.id (1:1)
- manual_review_queue.assigned_to → users.id (N:1)
- calculation_audits.user_id → users.id (N:1)
```

## Status State Machine

```
manual_review_queue.status:

    ┌─────────┐
    │ pending │  ← Initial state (unassigned or newly created)
    └────┬────┘
         │
         │ Pharmacist assigns to self
         │ POST /assign
         ▼
   ┌────────────┐
   │ in_review  │  ← Assigned and being reviewed
   └─────┬──────┘
         │
         ├─────────────────┬─────────────────┐
         │                 │                  │
         │ Approve         │ Reject           │ Defer
         │                 │                  │
         ▼                 ▼                  ▼
   ┌───────────┐     ┌───────────┐     ┌────────────┐
   │ completed │     │ completed │     │ in_review  │
   │ (approved)│     │ (rejected)│     │ (deferred) │
   └───────────┘     └───────────┘     └────────────┘
                                              │
                                              │ Resume
                                              │ later
                                              ▼
                                        ┌────────────┐
                                        │ in_review  │
                                        └────────────┘
```

## Priority Assignment Logic

```typescript
function calculatePriority(confidenceScore: number): Priority {
  if (confidenceScore < 0.5) {
    return 'high';      // 0-49% confidence → High priority
  } else if (confidenceScore < 0.7) {
    return 'medium';    // 50-69% confidence → Medium priority
  } else {
    return 'low';       // 70-79% confidence → Low priority
  }
}

// Note: 80%+ confidence items don't enter the queue
```

## Integration Points Summary

```
┌──────────────┐
│   TASK 5     │  Creates queue items for low confidence
│  Validation  │  Calculates priority
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   TASK 10    │  Provides database schema and services
│   Database   │  CRUD operations via manualReviewQueue.ts
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   TASK 12    │  UI and API endpoints
│ Review Queue │  Pharmacist workflow
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   TASK 11    │  Logs all review actions
│ Audit Logging│  Tracks reviewer decisions
└──────────────┘
```

This architecture ensures clean separation of concerns while maintaining tight integration between all components.
