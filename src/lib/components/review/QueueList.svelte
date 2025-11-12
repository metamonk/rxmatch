<script lang="ts">
  import type { ReviewQueueItemWithDetails } from '$lib/types/review';

  interface Props {
    items: ReviewQueueItemWithDetails[];
    onitemSelect?: (id: string) => void;
  }

  let { items, onitemSelect }: Props = $props();

  function getConfidenceClass(score: number | null | undefined): string {
    if (!score) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getPriorityBadgeClass(priority: string): string {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No items to review</h3>
      <p class="mt-1 text-sm text-gray-500">All prescriptions have been reviewed or no items match the filter.</p>
    </div>
  {:else}
    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prescription
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each items as item}
              {@const audit = item.calculationAudit}
              {@const parsedResult = audit?.parsedResult as any}
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {getPriorityBadgeClass(item.reviewQueueItem.priority)}">
                    {item.reviewQueueItem.priority}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {getStatusBadgeClass(item.reviewQueueItem.status)}">
                    {item.reviewQueueItem.status.replace('_', ' ')}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-900 font-medium">
                    {#if parsedResult?.drugName}
                      {parsedResult.drugName} {parsedResult.strength || ''} {parsedResult.form || ''}
                    {:else if audit?.prescriptionText}
                      {truncateText(audit.prescriptionText, 80)}
                    {:else}
                      <span class="text-gray-500 italic">No prescription data</span>
                    {/if}
                  </div>
                  {#if parsedResult?.quantity}
                    <div class="text-xs text-gray-500 mt-1">
                      Qty: {parsedResult.quantity}
                    </div>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium {getConfidenceClass(audit?.confidenceScore)}">
                    {audit?.confidenceScore ? `${(audit.confidenceScore * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {#if item.assignedUser}
                      <div class="flex items-center">
                        <span class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white text-xs font-medium mr-2">
                          {item.assignedUser.displayName?.charAt(0) || item.assignedUser.email.charAt(0).toUpperCase()}
                        </span>
                        <span class="truncate max-w-[120px]">
                          {item.assignedUser.displayName || item.assignedUser.email}
                        </span>
                      </div>
                    {:else}
                      <span class="text-gray-500 italic">Unassigned</span>
                    {/if}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(item.reviewQueueItem.createdAt)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onclick={() => onitemSelect?.(item.reviewQueueItem.id)}
                    class="text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Review
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
