<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { ReviewDetail, ReviewActions } from '$lib/components/review';
  import type { ReviewQueueItemWithDetails, ReviewDecision } from '$lib/types/review';

  let item = $state<ReviewQueueItemWithDetails | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isProcessing = $state(false);

  // Mock current user ID - in a real app, this would come from auth context
  const currentUserId = 'user-123'; // TODO: Replace with actual auth

  let itemId = $derived($page.params.id);

  async function loadItem() {
    if (!itemId) return;

    isLoading = true;
    error = null;

    try {
      const response = await fetch(`/api/review-queue/${itemId}`);
      const result = await response.json();

      if (result.success) {
        item = result.data;
      } else {
        error = result.error || 'Failed to load review item';
      }
    } catch (err) {
      console.error('Error loading review item:', err);
      error = err instanceof Error ? err.message : 'Failed to load review item';
    } finally {
      isLoading = false;
    }
  }

  async function handleAssign(userId: string) {
    if (!itemId) return;

    isProcessing = true;
    error = null;

    try {
      const response = await fetch(`/api/review-queue/${itemId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload the item to get updated data
        await loadItem();
      } else {
        error = result.error || 'Failed to assign item';
      }
    } catch (err) {
      console.error('Error assigning item:', err);
      error = err instanceof Error ? err.message : 'Failed to assign item';
    } finally {
      isProcessing = false;
    }
  }

  async function handleAction(decision: ReviewDecision) {
    if (!itemId) return;

    isProcessing = true;
    error = null;

    try {
      let endpoint = '';
      let body: any = { userId: currentUserId };

      switch (decision.action) {
        case 'approve':
          endpoint = 'approve';
          body.notes = decision.notes;
          break;
        case 'reject':
          endpoint = 'reject';
          body.reason = decision.reason;
          body.notes = decision.notes;
          break;
        case 'defer':
          endpoint = 'notes';
          body.notes = `[DEFERRED] ${decision.notes || 'Review deferred for later'}`;
          break;
        default:
          throw new Error('Unknown action');
      }

      const response = await fetch(`/api/review-queue/${itemId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        // Show success message and redirect to queue
        alert(`Review ${decision.action}d successfully!`);
        goto('/review-queue');
      } else {
        error = result.error || `Failed to ${decision.action} review`;
      }
    } catch (err) {
      console.error('Error processing review action:', err);
      error = err instanceof Error ? err.message : 'Failed to process review action';
    } finally {
      isProcessing = false;
    }
  }

  onMount(() => {
    loadItem();
  });
</script>

<svelte:head>
  <title>Review Item - RxMatch</title>
  <meta name="description" content="Review prescription calculation" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            Review Item Details
          </h1>
          <p class="mt-1 text-sm text-gray-600">
            Review and take action on prescription calculation
          </p>
        </div>
        <a
          href="/review-queue"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          ← Back to Queue
        </a>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading State -->
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="animate-spin h-10 w-10 mx-auto text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-600">Loading review item...</p>
        </div>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg class="mx-auto h-12 w-12 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-semibold text-red-900 mb-2">Error Loading Item</h3>
        <p class="text-red-700 mb-4">{error}</p>
        <button
          onclick={loadItem}
          class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Try Again
        </button>
      </div>
    {:else if item}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content (2/3 width) -->
        <div class="lg:col-span-2 space-y-6">
          <ReviewDetail item={item} />
        </div>

        <!-- Sidebar (1/3 width) -->
        <div class="space-y-6">
          <ReviewActions
            item={item}
            currentUserId={currentUserId}
            onaction={handleAction}
            onassign={handleAssign}
            disabled={isProcessing}
          />
        </div>
      </div>

      <!-- Processing Overlay -->
      {#if isProcessing}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
            <svg class="animate-spin h-12 w-12 mx-auto text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Processing...</h3>
            <p class="text-gray-600 text-sm">
              Processing your review action
            </p>
          </div>
        </div>
      {/if}
    {:else}
      <div class="text-center py-12">
        <p class="text-gray-600">Item not found</p>
      </div>
    {/if}
  </main>
</div>
