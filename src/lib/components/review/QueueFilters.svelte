<script lang="ts">
  import type { ReviewQueueFilters } from '$lib/types/review';
  import { Button, Card } from '$lib/components/ui';

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

<Card variant="elevated" padding="md" class="animate-slide-in">
  <div class="flex flex-wrap items-center gap-4">
    <!-- Status Filter -->
    <div class="flex-shrink-0">
      <label for="status-filter" class="label mb-2">
        <span class="text-sm font-semibold">Status</span>
      </label>
      <select
        id="status-filter"
        onchange={handleStatusChange}
        value={filters.status || 'all'}
        class="select w-40 text-sm"
      >
        <option value="all">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="in_review">In Review</option>
        <option value="completed">Completed</option>
      </select>
    </div>

    <!-- Priority Filter -->
    <div class="flex-shrink-0">
      <label for="priority-filter" class="label mb-2">
        <span class="text-sm font-semibold">Priority</span>
      </label>
      <select
        id="priority-filter"
        onchange={handlePriorityChange}
        value={filters.priority || 'all'}
        class="select w-40 text-sm"
      >
        <option value="all">All Priorities</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>

    <!-- Unassigned Only Toggle -->
    <div class="flex items-center pt-6">
      <label class="label flex items-center gap-2 cursor-pointer">
        <input
          id="unassigned-only"
          type="checkbox"
          checked={filters.unassignedOnly || false}
          onchange={handleUnassignedToggle}
          class="checkbox"
        />
        <span class="text-sm font-medium">Unassigned only</span>
      </label>
    </div>

    <!-- Clear Filters -->
    {#if hasActiveFilters}
      <div class="flex items-center pt-6">
        <Button
          variant="ghost"
          size="sm"
          onclick={handleClearFilters}
        >
          Clear filters
        </Button>
      </div>
    {/if}
  </div>
</Card>
