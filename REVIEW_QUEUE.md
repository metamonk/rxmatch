# Manual Review Queue System

## Overview

The Manual Review Queue system allows pharmacists to review and approve low-confidence prescription calculations before they proceed to fulfillment. This system ensures accuracy and safety for prescriptions that the AI parsing system flagged with confidence scores below the threshold.

## Architecture

### Components

#### 1. Database Layer (`src/lib/db/`)

**Schema (`schema.ts`):**
- `manualReviewQueue` - Queue items tracking review status
- `calculationAudits` - Prescription calculation records
- `users` - User accounts (pharmacists, admins)

**Services (`services/manualReviewQueue.ts`):**
- `createReviewQueueItem()` - Add item to queue
- `getReviewQueueItemWithDetails()` - Get item with related data
- `assignReviewQueueItem()` - Assign to pharmacist
- `updateReviewQueueItemStatus()` - Update status
- `listPendingReviewQueueItems()` - Get pending items
- `getNextReviewItem()` - Get next available item

#### 2. UI Components (`src/lib/components/review/`)

**QueueList.svelte:**
- Displays table of review queue items
- Shows priority, status, confidence score, assignee
- Filterable and sortable
- Click to view details

**QueueFilters.svelte:**
- Filter by status (pending, in_review, completed)
- Filter by priority (high, medium, low)
- Filter unassigned items only
- Clear filters button

**ReviewDetail.svelte:**
- Shows original prescription text
- Displays parsed prescription data with confidence
- Shows RxNorm/RxCUI information
- Lists NDC packages found
- Displays existing notes

**ReviewActions.svelte:**
- Assign to self button
- Approve button with confirmation
- Reject button with reason form
- Defer button with notes
- Validates user permissions

#### 3. API Endpoints (`src/routes/api/review-queue/`)

**GET /api/review-queue**
- List queue items with filters
- Query params: status, priority, assignedTo, unassignedOnly

**GET /api/review-queue/[id]**
- Get specific item with full details

**POST /api/review-queue/[id]/assign**
- Assign item to user
- Body: `{ userId: string }`

**POST /api/review-queue/[id]/approve**
- Approve calculation
- Body: `{ userId: string, notes?: string }`

**POST /api/review-queue/[id]/reject**
- Reject calculation
- Body: `{ userId: string, reason: string, notes?: string }`

**POST /api/review-queue/[id]/notes**
- Add notes to item
- Body: `{ userId: string, notes: string }`

**GET /api/review-queue/next**
- Get next available unassigned item

#### 4. Pages (`src/routes/review-queue/`)

**`/review-queue`**
- Queue dashboard with stats
- Filterable list of items
- Auto-refreshes every 30 seconds

**`/review-queue/[id]`**
- Detailed review page
- Full prescription information
- Action buttons for approve/reject/defer
- Assignment controls

### Workflow

#### 1. Queue Item Creation (Automatic)

When Task 5 (Validation Layer) detects low confidence:

```typescript
// In validation service
if (confidenceScore < 0.8) {
  const audit = await createCalculationAudit({
    prescriptionText,
    parsedResult,
    confidenceScore,
    status: 'pending',
    // ... other fields
  });

  await createReviewQueueItem({
    calculationId: audit.id,
    priority: calculatePriority(confidenceScore),
    status: 'pending',
  });
}
```

#### 2. Pharmacist Review Process

**Step 1: View Queue**
- Navigate to `/review-queue`
- See all pending/in-review items
- Filter by status, priority, assignment

**Step 2: Select Item**
- Click "Review" button on item
- Navigate to `/review-queue/[id]`

**Step 3: Assign to Self**
- Click "Assign to Me" button
- Status changes to "in_review"
- Item locked to assigned pharmacist

**Step 4: Review Details**
- Read original prescription text
- Verify parsed medication data
- Check confidence scores for each field
- Review RxNorm/NDC information
- Check for validation warnings

**Step 5: Take Action**

**Option A: Approve**
```typescript
POST /api/review-queue/[id]/approve
{
  userId: "pharmacist-123",
  notes: "Verified medication details"
}
```
- Calculation status → "approved"
- Queue item status → "completed"
- Proceeds to fulfillment

**Option B: Reject**
```typescript
POST /api/review-queue/[id]/reject
{
  userId: "pharmacist-123",
  reason: "Incorrect dosage form",
  notes: "Should be extended release"
}
```
- Calculation status → "rejected"
- Queue item status → "completed"
- Calculation blocked from fulfillment

**Option C: Defer**
```typescript
POST /api/review-queue/[id]/notes
{
  userId: "pharmacist-123",
  notes: "Need to consult with doctor"
}
```
- Status remains "in_review"
- Item stays in queue for later

#### 3. Audit Logging

All review actions are logged via Task 11's audit service:

```typescript
await auditService.logEvent({
  eventType: 'review_approved',
  metadata: {
    reviewQueueId: id,
    calculationId: calculationId,
    userId: userId,
    timestamp: new Date().toISOString()
  }
}, { userId });
```

**Logged Events:**
- Queue item created
- Item assigned/reassigned
- Review approved
- Review rejected
- Notes added
- Status changes
- Priority changes

### Priority Calculation

Priority is automatically assigned based on confidence score:

```typescript
function calculatePriority(confidenceScore: number): 'low' | 'medium' | 'high' {
  if (confidenceScore < 0.5) return 'high';
  if (confidenceScore < 0.7) return 'medium';
  return 'low';
}
```

### Status Transitions

```
pending → in_review → completed
   ↓          ↓
   └──────────┘ (can stay pending/in_review if deferred)
```

**pending:**
- Initial state
- Unassigned or assigned but not started

**in_review:**
- Assigned to pharmacist
- Review in progress

**completed:**
- Review finished
- Decision made (approved or rejected)

## Integration Points

### Task 5: Validation & Safety Layer
- Creates review queue items for low-confidence prescriptions
- Sets initial priority based on confidence score

### Task 10: Database Schema
- Provides `manual_review_queue` table
- Provides `calculation_audits` table
- Provides `users` table for assignment

### Task 11: Audit Logging
- Logs all review actions
- Tracks reviewer identity
- Records decision rationale
- Monitors time spent in review

## Security & Permissions

### Current Implementation
- Mock user ID used for testing
- All users can access review queue (TODO: Add auth)

### Future Requirements
- Only pharmacists can access `/review-queue`
- Only assigned pharmacist can approve/reject
- Admins can reassign items
- Audit trail for all actions

## Testing

### Automated Tests

Run the test suite:

```typescript
import { runAllTests } from '$lib/test/reviewQueueTest';
await runAllTests();
```

Tests cover:
1. Creating review items
2. Assigning to pharmacist
3. Approving calculations
4. Rejecting calculations
5. Listing and filtering items

### Manual Testing Checklist

**Queue Dashboard:**
- [ ] Items display in table format
- [ ] Filters work correctly
- [ ] Stats summary shows accurate counts
- [ ] Auto-refresh updates data
- [ ] Click "Review" navigates to detail page

**Review Detail Page:**
- [ ] Original prescription text displays
- [ ] Parsed data shows with confidence scores
- [ ] RxNorm/NDC information appears
- [ ] Assignment controls work
- [ ] Action buttons functional

**Approve Flow:**
- [ ] Confirmation dialog appears
- [ ] Can add optional notes
- [ ] Success message displays
- [ ] Redirects to queue
- [ ] Status updates in database

**Reject Flow:**
- [ ] Reason field is required
- [ ] Can add additional notes
- [ ] Success message displays
- [ ] Redirects to queue
- [ ] Rejection logged with reason

**Defer Flow:**
- [ ] Notes field optional
- [ ] Item remains in queue
- [ ] Status stays "in_review"
- [ ] Notes saved to item

**Audit Logging:**
- [ ] All actions create audit entries
- [ ] User ID recorded correctly
- [ ] Timestamps accurate
- [ ] Metadata complete

## Performance Considerations

### Database Queries
- Indexes on `status`, `priority`, `assignedTo`, `createdAt`
- Joins optimized with leftJoin
- Filtered queries use appropriate indexes

### UI Optimization
- Auto-refresh limited to 30 seconds
- Pagination not yet implemented (TODO for scale)
- Filters applied server-side

### Caching
- No caching currently implemented
- Consider Redis for high-volume queues

## Future Enhancements

### Authentication & Authorization
- [ ] Integrate with Firebase Auth
- [ ] Role-based access control (RBAC)
- [ ] Session management

### Advanced Features
- [ ] Bulk actions (approve/reject multiple)
- [ ] Assignment algorithms (auto-assign to least busy)
- [ ] SLA tracking (time in queue alerts)
- [ ] Review history for users
- [ ] Performance metrics dashboard

### Notifications
- [ ] Email notifications for new items
- [ ] Slack/Discord webhooks
- [ ] In-app notifications

### Analytics
- [ ] Average review time
- [ ] Approval vs rejection rates
- [ ] Pharmacist performance metrics
- [ ] Queue backlog trends

### Mobile Support
- [ ] Responsive design improvements
- [ ] Touch-friendly controls
- [ ] Mobile app (React Native/Flutter)

## Troubleshooting

### Items not appearing in queue
1. Check database connection
2. Verify `manual_review_queue` table exists
3. Check API endpoint returns data
4. Verify filters not excluding items

### Cannot assign items
1. Check user ID is valid
2. Verify database foreign key constraints
3. Check API endpoint /assign works
4. Verify audit logging not blocking

### Approve/Reject failing
1. Check calculation ID exists
2. Verify status transitions allowed
3. Check audit service functional
4. Review API endpoint logs

## API Response Formats

### Success Response
```json
{
  "success": true,
  "data": { /* item or items */ },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Database Schema Reference

### manual_review_queue
```sql
CREATE TABLE manual_review_queue (
  id TEXT PRIMARY KEY,
  calculation_id TEXT NOT NULL REFERENCES calculation_audits(id),
  assigned_to TEXT REFERENCES users(id),
  priority priority DEFAULT 'medium',
  status review_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
- `calculation_id` - Foreign key lookup
- `assigned_to` - Assignment queries
- `status` - Status filtering
- `priority` - Priority sorting
- `created_at` - Time-based ordering

## Contact & Support

For issues or questions about the review queue system, contact the development team or open an issue in the project repository.
