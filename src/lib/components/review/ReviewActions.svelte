<script lang="ts">
  import type { ReviewQueueItemWithDetails, ReviewDecision } from '$lib/types/review';

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

<div class="bg-white rounded-lg border border-gray-200 p-6">
  <h2 class="text-lg font-semibold text-gray-900 mb-4">Review Actions</h2>

  <div class="space-y-4">
    <!-- Assignment Section -->
    {#if isUnassigned && currentUserId}
      <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p class="text-sm text-yellow-800 mb-3">
          This item is unassigned. Assign it to yourself to begin review.
        </p>
        <button
          onclick={handleAssignToSelf}
          disabled={disabled}
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Assign to Me
        </button>
      </div>
    {/if}

    <!-- Action Buttons -->
    {#if !isUnassigned || isAssignedToCurrentUser}
      <div class="flex flex-wrap gap-3">
        <!-- Approve Button -->
        {#if !showApproveConfirm}
          <button
            onclick={handleApprove}
            disabled={disabled || (!isAssignedToCurrentUser && !isUnassigned)}
            class="flex-1 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="inline-block w-5 h-5 mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Approve
          </button>
        {/if}

        <!-- Reject Button -->
        {#if !showRejectForm}
          <button
            onclick={() => (showRejectForm = true)}
            disabled={disabled || (!isAssignedToCurrentUser && !isUnassigned)}
            class="flex-1 px-4 py-3 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="inline-block w-5 h-5 mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        {/if}

        <!-- Defer Button -->
        {#if !showDeferForm}
          <button
            onclick={() => (showDeferForm = true)}
            disabled={disabled || (!isAssignedToCurrentUser && !isUnassigned)}
            class="flex-1 px-4 py-3 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="inline-block w-5 h-5 mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Defer
          </button>
        {/if}
      </div>
    {/if}

    <!-- Approve Confirmation -->
    {#if showApproveConfirm}
      <div class="bg-green-50 border border-green-200 rounded-md p-4">
        <h3 class="text-sm font-medium text-green-800 mb-3">Confirm Approval</h3>
        <p class="text-sm text-green-700 mb-4">
          This will approve the calculation and allow it to proceed to fulfillment.
        </p>
        <div class="mb-4">
          <label for="approve-notes" class="block text-sm font-medium text-green-800 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            id="approve-notes"
            bind:value={additionalNotes}
            rows="3"
            class="block w-full rounded-md border-green-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
            placeholder="Add any notes about this approval..."
          ></textarea>
        </div>
        <div class="flex gap-3">
          <button
            onclick={handleApprove}
            disabled={disabled}
            class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Approval
          </button>
          <button
            onclick={cancelApprove}
            disabled={disabled}
            class="px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <!-- Reject Form -->
    {#if showRejectForm}
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 class="text-sm font-medium text-red-800 mb-3">Reject Calculation</h3>
        <div class="mb-4">
          <label for="reject-reason" class="block text-sm font-medium text-red-800 mb-2">
            Reason for Rejection <span class="text-red-600">*</span>
          </label>
          <textarea
            id="reject-reason"
            bind:value={rejectReason}
            rows="3"
            required
            class="block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
            placeholder="Explain why this calculation is being rejected..."
          ></textarea>
        </div>
        <div class="mb-4">
          <label for="reject-notes" class="block text-sm font-medium text-red-800 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            id="reject-notes"
            bind:value={additionalNotes}
            rows="2"
            class="block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
            placeholder="Any other relevant information..."
          ></textarea>
        </div>
        <div class="flex gap-3">
          <button
            onclick={handleReject}
            disabled={disabled}
            class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Rejection
          </button>
          <button
            onclick={cancelReject}
            disabled={disabled}
            class="px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <!-- Defer Form -->
    {#if showDeferForm}
      <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h3 class="text-sm font-medium text-gray-800 mb-3">Defer Review</h3>
        <p class="text-sm text-gray-600 mb-4">
          This will postpone the review for later. The item will remain in the queue.
        </p>
        <div class="mb-4">
          <label for="defer-notes" class="block text-sm font-medium text-gray-800 mb-2">
            Notes (Optional)
          </label>
          <textarea
            id="defer-notes"
            bind:value={deferNotes}
            rows="3"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 text-sm"
            placeholder="Why is this being deferred? When should it be reviewed?"
          ></textarea>
        </div>
        <div class="flex gap-3">
          <button
            onclick={handleDefer}
            disabled={disabled}
            class="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Defer Review
          </button>
          <button
            onclick={cancelDefer}
            disabled={disabled}
            class="px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <!-- Warning if not assigned to current user -->
    {#if !isUnassigned && !isAssignedToCurrentUser}
      <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p class="text-sm text-yellow-800">
          This item is assigned to another user. You cannot perform actions on it unless you are the assigned reviewer.
        </p>
      </div>
    {/if}
  </div>
</div>
