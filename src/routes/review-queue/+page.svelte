<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { QueueList, QueueFilters } from '$lib/components/review';
  import type { ReviewQueueItemWithDetails, ReviewQueueFilters } from '$lib/types/review';

  let items = $state<ReviewQueueItemWithDetails[]>([]);
  let filters = $state<ReviewQueueFilters>({});
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  async function loadItems() {
    isLoading = true;
    error = null;

    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
      if (filters.unassignedOnly) params.set('unassignedOnly', 'true');

      const response = await fetch(`/api/review-queue?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        items = result.data;
      } else {
        error = result.error || 'Failed to load review queue items';
      }
    } catch (err) {
      console.error('Error loading review queue items:', err);
      error = err instanceof Error ? err.message : 'Failed to load review queue items';
    } finally {
      isLoading = false;
    }
  }

  function handleFilterChange(newFilters: ReviewQueueFilters) {
    filters = newFilters;
    loadItems();
  }

  function handleItemSelect(id: string) {
    goto(`/review-queue/${id}`);
  }

  onMount(() => {
    loadItems();
  });

  // Auto-refresh every 30 seconds
  onMount(() => {
    const interval = setInterval(() => {
      loadItems();
    }, 30000);

    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>Manual Review Queue - RxMatch</title>
  <meta name="description" content="Review low-confidence prescriptions" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            Manual Review Queue
          </h1>
          <p class="mt-1 text-sm text-gray-600">
            Review and approve low-confidence prescription calculations
          </p>
        </div>
        <a
          href="/"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          ← Back to Home
        </a>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
            <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Items</p>
            <p class="text-2xl font-bold text-gray-900">{items.length}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0 bg-yellow-100 rounded-md p-3">
            <svg class="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Pending</p>
            <p class="text-2xl font-bold text-gray-900">
              {items.filter(i => i.reviewQueueItem.status === 'pending').length}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
            <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">In Review</p>
            <p class="text-2xl font-bold text-gray-900">
              {items.filter(i => i.reviewQueueItem.status === 'in_review').length}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center">
          <div class="flex-shrink-0 bg-green-100 rounded-md p-3">
            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Completed</p>
            <p class="text-2xl font-bold text-gray-900">
              {items.filter(i => i.reviewQueueItem.status === 'completed').length}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6">
      <QueueFilters filters={filters} onfilterChange={handleFilterChange} />
    </div>

    <!-- Loading State -->
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="animate-spin h-10 w-10 mx-auto text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-600">Loading review queue...</p>
        </div>
      </div>
    {:else if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg class="mx-auto h-12 w-12 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-semibold text-red-900 mb-2">Error Loading Queue</h3>
        <p class="text-red-700 mb-4">{error}</p>
        <button
          onclick={loadItems}
          class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Try Again
        </button>
      </div>
    {:else}
      <QueueList items={items} onitemSelect={handleItemSelect} />
    {/if}
  </main>
</div>
