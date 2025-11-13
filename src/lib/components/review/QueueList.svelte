<script lang="ts">
  import type { ReviewQueueItemWithDetails } from '$lib/types/review';
  import { Button, Card, Badge } from '$lib/components/ui';

  interface Props {
    items: ReviewQueueItemWithDetails[];
    onitemSelect?: (id: string) => void;
  }

  let { items, onitemSelect }: Props = $props();

  function getConfidenceClass(score: number | null | undefined): string {
    if (!score) return 'text-surface-500-400';
    if (score >= 0.8) return 'text-success-500';
    if (score >= 0.6) return 'text-warning-500';
    return 'text-error-500';
  }

  function getPriorityBadge(priority: string): { variant: 'error' | 'warning' | 'primary' | 'info'; label: string } {
    switch (priority) {
      case 'high':
        return { variant: 'error', label: priority };
      case 'medium':
        return { variant: 'warning', label: priority };
      case 'low':
        return { variant: 'primary', label: priority };
      default:
        return { variant: 'info', label: priority };
    }
  }

  function getStatusBadge(status: string): { variant: 'info' | 'primary' | 'success'; label: string } {
    switch (status) {
      case 'pending':
        return { variant: 'info', label: status.replace('_', ' ') };
      case 'in_review':
        return { variant: 'primary', label: status.replace('_', ' ') };
      case 'completed':
        return { variant: 'success', label: status.replace('_', ' ') };
      default:
        return { variant: 'info', label: status.replace('_', ' ') };
    }
  }

  function formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
</script>

<div class="space-y-4">
  {#if items.length === 0}
    <Card variant="outlined" padding="lg" class="text-center animate-fade-in">
      <svg class="mx-auto h-12 w-12 text-surface-400-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <h3 class="h3 mt-4">No items to review</h3>
      <p class="mt-2 text-surface-600-300">All prescriptions have been reviewed or no items match the filter.</p>
    </Card>
  {:else}
    <Card variant="elevated" padding="none" class="overflow-hidden animate-fade-in">
      <div class="overflow-x-auto">
        <table class="table table-hover w-full">
          <thead class="variant-soft-surface">
            <tr>
              <th class="table-cell-fit text-left">Priority</th>
              <th class="table-cell-fit text-left">Status</th>
              <th class="text-left">Prescription</th>
              <th class="table-cell-fit text-left">Confidence</th>
              <th class="table-cell-fit text-left">Assigned To</th>
              <th class="table-cell-fit text-left">Created</th>
              <th class="table-cell-fit text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each items as item}
              {@const audit = item.calculationAudit}
              {@const parsedResult = audit?.parsedResult as any}
              {@const priorityBadge = getPriorityBadge(item.reviewQueueItem.priority)}
              {@const statusBadge = getStatusBadge(item.reviewQueueItem.status)}
              <tr>
                <td>
                  <Badge variant={priorityBadge.variant} size="sm">
                    {priorityBadge.label}
                  </Badge>
                </td>
                <td>
                  <Badge variant={statusBadge.variant} size="sm">
                    {statusBadge.label}
                  </Badge>
                </td>
                <td>
                  <div class="text-sm font-medium">
                    {#if parsedResult?.drugName}
                      {parsedResult.drugName} {parsedResult.strength || ''} {parsedResult.form || ''}
                    {:else if audit?.prescriptionText}
                      {truncateText(audit.prescriptionText, 80)}
                    {:else}
                      <span class="text-surface-500-400 italic">No prescription data</span>
                    {/if}
                  </div>
                  {#if parsedResult?.quantity}
                    <div class="text-xs text-surface-600-300 mt-1">
                      Qty: {parsedResult.quantity}
                    </div>
                  {/if}
                </td>
                <td>
                  <div class="text-sm font-bold {getConfidenceClass(audit?.confidenceScore)}">
                    {audit?.confidenceScore ? `${(audit.confidenceScore * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </td>
                <td>
                  <div class="text-sm">
                    {#if item.assignedUser}
                      <div class="flex items-center gap-2">
                        <span class="avatar variant-filled-primary w-6 h-6 text-xs">
                          {item.assignedUser.displayName?.charAt(0) || item.assignedUser.email.charAt(0).toUpperCase()}
                        </span>
                        <span class="truncate max-w-[120px]">
                          {item.assignedUser.displayName || item.assignedUser.email}
                        </span>
                      </div>
                    {:else}
                      <span class="text-surface-500-400 italic">Unassigned</span>
                    {/if}
                  </div>
                </td>
                <td class="text-sm text-surface-600-300">
                  {formatDate(item.reviewQueueItem.createdAt)}
                </td>
                <td class="text-right">
                  <Button
                    variant="primary"
                    size="sm"
                    onclick={() => onitemSelect?.(item.reviewQueueItem.id)}
                  >
                    Review
                  </Button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </Card>
  {/if}
</div>
