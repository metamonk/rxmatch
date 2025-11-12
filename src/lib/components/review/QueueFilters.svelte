<script lang="ts">
  import type { ReviewQueueFilters } from '$lib/types/review';

  interface Props {
    filters: ReviewQueueFilters;
    onfilterChange?: (filters: ReviewQueueFilters) => void;
  }

  let { filters, onfilterChange }: Props = $props();

  function handleStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newFilters = { ...filters };
    if (target.value === 'all') {
      delete newFilters.status;
    } else {
      newFilters.status = target.value as 'pending' | 'in_review' | 'completed';
    }
    onfilterChange?.(newFilters);
  }

  function handlePriorityChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newFilters = { ...filters };
    if (target.value === 'all') {
      delete newFilters.priority;
    } else {
      newFilters.priority = target.value as 'low' | 'medium' | 'high';
    }
    onfilterChange?.(newFilters);
  }

  function handleUnassignedToggle(event: Event) {
    const target = event.target as HTMLInputElement;
    const newFilters = { ...filters };
    newFilters.unassignedOnly = target.checked;
    if (!target.checked) {
      delete newFilters.unassignedOnly;
    }
    onfilterChange?.(newFilters);
  }

  function handleClearFilters() {
    onfilterChange?.({});
  }

  let hasActiveFilters = $derived(
    filters.status || filters.priority || filters.unassignedOnly
  );
</script>

<div class="bg-white rounded-lg border border-gray-200 p-4">
  <div class="flex flex-wrap items-center gap-4">
    <!-- Status Filter -->
    <div class="flex-shrink-0">
      <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">
        Status
      </label>
      <select
        id="status-filter"
        onchange={handleStatusChange}
        value={filters.status || 'all'}
        class="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
      >
        <option value="all">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="in_review">In Review</option>
        <option value="completed">Completed</option>
      </select>
    </div>

    <!-- Priority Filter -->
    <div class="flex-shrink-0">
      <label for="priority-filter" class="block text-sm font-medium text-gray-700 mb-1">
        Priority
      </label>
      <select
        id="priority-filter"
        onchange={handlePriorityChange}
        value={filters.priority || 'all'}
        class="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
      >
        <option value="all">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>

    <!-- Unassigned Only Toggle -->
    <div class="flex items-center pt-6">
      <input
        id="unassigned-only"
        type="checkbox"
        checked={filters.unassignedOnly || false}
        onchange={handleUnassignedToggle}
        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label for="unassigned-only" class="ml-2 text-sm text-gray-700">
        Unassigned only
      </label>
    </div>

    <!-- Clear Filters -->
    {#if hasActiveFilters}
      <div class="flex items-center pt-6">
        <button
          onclick={handleClearFilters}
          class="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Clear filters
        </button>
      </div>
    {/if}
  </div>
</div>
