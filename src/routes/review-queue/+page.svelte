<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { QueueList, QueueFilters } from '$lib/components/review';
  import { Button, Card, Badge, Logo } from '$lib/components/ui';
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

<div class="min-h-screen">
  <!-- Header -->
  <header class="bg-surface-50-900 border-b border-surface-200-700 shadow-lg animate-fade-in">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Logo size="lg" variant="default" />
          <div>
            <h1 class="text-4xl font-bold gradient-heading">
              Manual Review Queue
            </h1>
            <p class="mt-2 text-sm text-[var(--color-surface-600)] dark:text-[var(--color-surface-300)] font-medium">
              Review and approve low-confidence prescription calculations
            </p>
          </div>
        </div>
        <Button variant="ghost" onclick={() => goto('/')}>
          ← Back to Home
        </Button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-fade-in">
      <Card variant="elevated" padding="md" hover class="animate-slide-in">
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0 variant-filled-primary p-3 rounded-container-token">
            <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-[var(--color-surface-600)] dark:text-[var(--color-surface-300)] uppercase tracking-wide">Total Items</p>
            <p class="text-3xl font-bold text-primary-500">{items.length}</p>
          </div>
        </div>
      </Card>

      <Card variant="elevated" padding="md" hover class="animate-slide-in [animation-delay:50ms]">
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0 variant-filled-warning p-3 rounded-container-token">
            <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-[var(--color-surface-600)] dark:text-[var(--color-surface-300)] uppercase tracking-wide">Pending</p>
            <p class="text-3xl font-bold text-warning-500">
              {items.filter(i => i.reviewQueueItem.status === 'pending').length}
            </p>
          </div>
        </div>
      </Card>

      <Card variant="elevated" padding="md" hover class="animate-slide-in [animation-delay:100ms]">
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0 variant-filled-secondary p-3 rounded-container-token">
            <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-[var(--color-surface-600)] dark:text-[var(--color-surface-300)] uppercase tracking-wide">In Review</p>
            <p class="text-3xl font-bold text-secondary-500">
              {items.filter(i => i.reviewQueueItem.status === 'in_review').length}
            </p>
          </div>
        </div>
      </Card>

      <Card variant="elevated" padding="md" hover class="animate-slide-in [animation-delay:150ms]">
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0 variant-filled-success p-3 rounded-container-token">
            <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-[var(--color-surface-600)] dark:text-[var(--color-surface-300)] uppercase tracking-wide">Completed</p>
            <p class="text-3xl font-bold text-success-500">
              {items.filter(i => i.reviewQueueItem.status === 'completed').length}
            </p>
          </div>
        </div>
      </Card>
    </div>

    <!-- Filters -->
    <div class="mb-6">
      <QueueFilters filters={filters} onfilterChange={handleFilterChange} />
    </div>

    <!-- Loading State -->
    {#if isLoading}
      <Card variant="elevated" padding="lg" class="text-center animate-fade-in">
        <div class="flex flex-col items-center gap-4">
          <div class="relative">
            <svg class="animate-spin h-16 w-16 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div class="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 opacity-20 blur-xl animate-pulse"></div>
          </div>
          <p class="text-lg font-semibold text-[var(--color-surface-600)] dark:text-[var(--color-surface-300)]">Loading review queue...</p>
        </div>
      </Card>
    {:else if error}
      <Card variant="elevated" padding="lg" class="border-red-600 border-2 text-center animate-fade-in">
        <div class="flex flex-col items-center gap-4">
          <div class="variant-filled-error p-4 rounded-full">
            <svg class="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="space-y-2">
            <h3 class="text-2xl font-bold text-red-600 dark:text-red-400">Error Loading Queue</h3>
            <p class="text-[var(--color-surface-600)] dark:text-[var(--color-surface-300)]">{error}</p>
          </div>
          <Button variant="danger" onclick={loadItems} class="mt-2">
            Try Again
          </Button>
        </div>
      </Card>
    {:else}
      <div class="animate-fade-in">
        <QueueList items={items} onitemSelect={handleItemSelect} />
      </div>
    {/if}
  </main>
</div>
