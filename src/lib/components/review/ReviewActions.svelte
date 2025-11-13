<script lang="ts">
  import type { ReviewQueueItemWithDetails, ReviewDecision } from '$lib/types/review';
  import { Button, Card } from '$lib/components/ui';

  interface Props {
    item: ReviewQueueItemWithDetails;
    currentUserId?: string | null;
    onaction?: (decision: ReviewDecision) => void;
    onassign?: (userId: string) => void;
    disabled?: boolean;
  }

  let { item, currentUserId, onaction, onassign, disabled = false }: Props = $props();

  let showApproveConfirm = $state(false);
  let showRejectForm = $state(false);
  let showDeferForm = $state(false);
  let showNotesForm = $state(false);

  let rejectReason = $state('');
  let deferNotes = $state('');
  let additionalNotes = $state('');

  let isAssignedToCurrentUser = $derived(
    currentUserId && item.reviewQueueItem.assignedTo === currentUserId
  );

  let isUnassigned = $derived(!item.reviewQueueItem.assignedTo);

  function handleApprove() {
    if (showApproveConfirm) {
      onaction?.({ action: 'approve', notes: additionalNotes || undefined });
      showApproveConfirm = false;
      additionalNotes = '';
    } else {
      showApproveConfirm = true;
    }
  }

  function handleReject() {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onaction?.({ action: 'reject', reason: rejectReason, notes: additionalNotes || undefined });
    showRejectForm = false;
    rejectReason = '';
    additionalNotes = '';
  }

  function handleDefer() {
    onaction?.({ action: 'defer', notes: deferNotes || undefined });
    showDeferForm = false;
    deferNotes = '';
  }

  function handleAssignToSelf() {
    if (currentUserId) {
      onassign?.(currentUserId);
    }
  }

  function cancelApprove() {
    showApproveConfirm = false;
    additionalNotes = '';
  }

  function cancelReject() {
    showRejectForm = false;
    rejectReason = '';
    additionalNotes = '';
  }

  function cancelDefer() {
    showDeferForm = false;
    deferNotes = '';
  }
</script>

<Card variant="elevated" padding="md" class="animate-fade-in">
  <h2 class="h3 mb-6">Review Actions</h2>

  <div class="space-y-4">
    <!-- Assignment Section -->
    {#if isUnassigned && currentUserId}
      <div class="alert variant-soft-warning">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <div class="alert-message flex-1">
          <p class="text-sm mb-3">
            This item is unassigned. Assign it to yourself to begin review.
          </p>
          <Button
            variant="primary"
            size="sm"
            onclick={handleAssignToSelf}
            disabled={disabled}
          >
            Assign to Me
          </Button>
        </div>
      </div>
    {/if}

    <!-- Action Buttons -->
    {#if !isUnassigned || isAssignedToCurrentUser}
      <div class="flex flex-wrap gap-3">
        <!-- Approve Button -->
        {#if !showApproveConfirm}
          <Button
            variant="primary"
            size="lg"
            onclick={handleApprove}
            disabled={disabled || (!isAssignedToCurrentUser && !isUnassigned)}
            class="flex-1"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Approve
          </Button>
        {/if}

        <!-- Reject Button -->
        {#if !showRejectForm}
          <Button
            variant="danger"
            size="lg"
            onclick={() => (showRejectForm = true)}
            disabled={disabled || (!isAssignedToCurrentUser && !isUnassigned)}
            class="flex-1"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </Button>
        {/if}

        <!-- Defer Button -->
        {#if !showDeferForm}
          <Button
            variant="secondary"
            size="lg"
            onclick={() => (showDeferForm = true)}
            disabled={disabled || (!isAssignedToCurrentUser && !isUnassigned)}
            class="flex-1"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Defer
          </Button>
        {/if}
      </div>
    {/if}

    <!-- Approve Confirmation -->
    {#if showApproveConfirm}
      <div class="alert variant-soft-success animate-slide-in">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <div class="alert-message flex-1">
          <h3 class="h4 mb-2">Confirm Approval</h3>
          <p class="text-sm mb-4">
            This will approve the calculation and allow it to proceed to fulfillment.
          </p>
          <div class="mb-4">
            <label for="approve-notes" class="label mb-2">
              <span class="text-sm font-semibold">Additional Notes (Optional)</span>
            </label>
            <textarea
              id="approve-notes"
              bind:value={additionalNotes}
              rows="3"
              class="textarea text-sm"
              placeholder="Add any notes about this approval..."
            ></textarea>
          </div>
          <div class="flex gap-3">
            <Button
              variant="primary"
              size="md"
              onclick={handleApprove}
              disabled={disabled}
            >
              Confirm Approval
            </Button>
            <Button
              variant="ghost"
              size="md"
              onclick={cancelApprove}
              disabled={disabled}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Reject Form -->
    {#if showRejectForm}
      <div class="alert variant-soft-error animate-slide-in">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="alert-message flex-1">
          <h3 class="h4 mb-3">Reject Calculation</h3>
          <div class="mb-4">
            <label for="reject-reason" class="label mb-2">
              <span class="text-sm font-semibold">Reason for Rejection <span class="text-error-500">*</span></span>
            </label>
            <textarea
              id="reject-reason"
              bind:value={rejectReason}
              rows="3"
              required
              class="textarea text-sm"
              placeholder="Explain why this calculation is being rejected..."
            ></textarea>
          </div>
          <div class="mb-4">
            <label for="reject-notes" class="label mb-2">
              <span class="text-sm font-semibold">Additional Notes (Optional)</span>
            </label>
            <textarea
              id="reject-notes"
              bind:value={additionalNotes}
              rows="2"
              class="textarea text-sm"
              placeholder="Any other relevant information..."
            ></textarea>
          </div>
          <div class="flex gap-3">
            <Button
              variant="danger"
              size="md"
              onclick={handleReject}
              disabled={disabled}
            >
              Confirm Rejection
            </Button>
            <Button
              variant="ghost"
              size="md"
              onclick={cancelReject}
              disabled={disabled}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Defer Form -->
    {#if showDeferForm}
      <Card variant="outlined" padding="md" class="variant-soft-surface animate-slide-in">
        <h3 class="h4 mb-3">Defer Review</h3>
        <p class="text-sm text-surface-600-300 mb-4">
          This will postpone the review for later. The item will remain in the queue.
        </p>
        <div class="mb-4">
          <label for="defer-notes" class="label mb-2">
            <span class="text-sm font-semibold">Notes (Optional)</span>
          </label>
          <textarea
            id="defer-notes"
            bind:value={deferNotes}
            rows="3"
            class="textarea text-sm"
            placeholder="Why is this being deferred? When should it be reviewed?"
          ></textarea>
        </div>
        <div class="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            onclick={handleDefer}
            disabled={disabled}
          >
            Defer Review
          </Button>
          <Button
            variant="ghost"
            size="md"
            onclick={cancelDefer}
            disabled={disabled}
          >
            Cancel
          </Button>
        </div>
      </Card>
    {/if}

    <!-- Warning if not assigned to current user -->
    {#if !isUnassigned && !isAssignedToCurrentUser}
      <div class="alert variant-soft-warning animate-slide-in">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <p class="alert-message text-sm">
          This item is assigned to another user. You cannot perform actions on it unless you are the assigned reviewer.
        </p>
      </div>
    {/if}
  </div>
</Card>
