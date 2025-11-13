<script lang="ts">
  import type { ReviewQueueItemWithDetails } from '$lib/types/review';
  import type { PrescriptionParse } from '$lib/types/prescription';
  import { Card, Badge, ProgressBar } from '$lib/components/ui';

  interface Props {
    item: ReviewQueueItemWithDetails;
  }

  let { item }: Props = $props();

  const audit = $derived(item.calculationAudit);
  const parsedResult = $derived(audit?.parsedResult as PrescriptionParse | null);
  const selectedPackages = $derived(audit?.selectedPackages as any[] | null);

  function getConfidenceClass(score: number | null | undefined): string {
    if (!score) return 'text-surface-500-400';
    if (score >= 0.8) return 'text-success-500';
    if (score >= 0.6) return 'text-warning-500';
    return 'text-error-500';
  }

  function formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
</script>

<div class="space-y-6">
  <!-- Header with Metadata -->
  <Card variant="elevated" padding="md" class="animate-fade-in">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <h3 class="text-xs font-semibold text-surface-600-300 uppercase tracking-wider mb-2">Priority</h3>
        <p class="text-sm font-bold">
          {item.reviewQueueItem.priority}
        </p>
      </div>
      <div>
        <h3 class="text-xs font-semibold text-surface-600-300 uppercase tracking-wider mb-2">Status</h3>
        <p class="text-sm font-bold">
          {item.reviewQueueItem.status.replace('_', ' ')}
        </p>
      </div>
      <div>
        <h3 class="text-xs font-semibold text-surface-600-300 uppercase tracking-wider mb-2">Created</h3>
        <p class="text-sm">
          {formatDate(item.reviewQueueItem.createdAt)}
        </p>
      </div>
      <div>
        <h3 class="text-xs font-semibold text-surface-600-300 uppercase tracking-wider mb-2">Assigned To</h3>
        <p class="text-sm">
          {#if item.assignedUser}
            {item.assignedUser.displayName || item.assignedUser.email}
          {:else}
            <span class="text-surface-500-400 italic">Unassigned</span>
          {/if}
        </p>
      </div>
    </div>
  </Card>

  <!-- Original Prescription Text -->
  <Card variant="elevated" padding="md" class="animate-slide-in">
    <h2 class="h3 mb-4">Original Prescription Text</h2>
    <div class="variant-soft-surface rounded-container-token p-4 font-mono text-sm whitespace-pre-wrap">
      {audit?.prescriptionText || 'No prescription text available'}
    </div>
  </Card>

  <!-- Parsed Prescription Data -->
  {#if parsedResult}
    <Card variant="elevated" padding="md" class="animate-slide-in [animation-delay:50ms]">
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="h3">Parsed Prescription Data</h2>
          <span class="text-lg font-bold {getConfidenceClass(audit?.confidenceScore)}">
            {audit?.confidenceScore ? `${(audit.confidenceScore * 100).toFixed(1)}%` : 'N/A'}
          </span>
        </div>
        {#if audit?.confidenceScore}
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-surface-600-300 font-medium">Confidence Score</span>
            </div>
            <ProgressBar value={audit.confidenceScore * 100} size="md" />
          </div>
        {/if}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-sm font-semibold text-surface-600-300 mb-2">Drug Name</h3>
          <p class="font-medium">{parsedResult.drugName}</p>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-surface-600-300 mb-2">Strength</h3>
          <p class="font-medium">{parsedResult.strength}</p>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-surface-600-300 mb-2">Form</h3>
          <p class="font-medium">{parsedResult.form}</p>
        </div>

        <div>
          <h3 class="text-sm font-semibold text-surface-600-300 mb-2">Quantity</h3>
          <p class="font-medium">{parsedResult.quantity}</p>
        </div>

        {#if parsedResult.sig}
          <div class="md:col-span-2">
            <h3 class="text-sm font-semibold text-surface-600-300 mb-2">Sig (Instructions)</h3>
            <p class="font-medium">{parsedResult.sig}</p>
          </div>
        {/if}

        {#if parsedResult.daysSupply}
          <div>
            <h3 class="text-sm font-semibold text-surface-600-300 mb-2">Days Supply</h3>
            <p class="font-medium">{parsedResult.daysSupply} days</p>
          </div>
        {/if}

        {#if parsedResult.normalizations?.originalDrugName}
          <div class="md:col-span-2 alert variant-soft-warning">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <div class="alert-message">
              <h3 class="h4 mb-1">Normalizations Applied</h3>
              <p class="text-sm">
                Original: <span class="font-mono">{parsedResult.normalizations.originalDrugName}</span>
              </p>
              {#if parsedResult.normalizations.spellingCorrections && parsedResult.normalizations.spellingCorrections.length > 0}
                <p class="text-sm mt-1">
                  Corrections: {parsedResult.normalizations.spellingCorrections.join(', ')}
                </p>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </Card>
  {/if}

  <!-- RxNorm/RxCUI Information -->
  {#if audit?.rxcui}
    <Card variant="elevated" padding="md" class="animate-slide-in [animation-delay:100ms]">
      <h2 class="h3 mb-4">RxNorm Information</h2>
      <div class="space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-surface-600-300 mb-2">RxCUI</h3>
          <p class="font-mono font-medium">{audit.rxcui}</p>
        </div>
        {#if audit.ndcCodes && Array.isArray(audit.ndcCodes) && audit.ndcCodes.length > 0}
          <div>
            <h3 class="text-sm font-semibold text-surface-600-300 mb-3">NDC Codes Found</h3>
            <div class="flex flex-wrap gap-2">
              {#each audit.ndcCodes as ndc}
                <Badge variant="primary" size="sm">
                  {ndc}
                </Badge>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </Card>
  {/if}

  <!-- Selected Packages -->
  {#if selectedPackages && selectedPackages.length > 0}
    <Card variant="elevated" padding="md" class="animate-slide-in [animation-delay:150ms]">
      <h2 class="h3 mb-4">Selected Packages</h2>
      <div class="space-y-4">
        {#each selectedPackages as pkg}
          <Card variant="outlined" padding="sm" class="variant-soft-surface">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h4 class="text-sm font-semibold text-surface-600-300 mb-1">NDC</h4>
                <p class="font-mono font-medium">{pkg.ndc}</p>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-surface-600-300 mb-1">Labeler</h4>
                <p class="font-medium">{pkg.labelerName}</p>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-surface-600-300 mb-1">Package Description</h4>
                <p class="font-medium">{pkg.packageDescription}</p>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-surface-600-300 mb-1">Quantity</h4>
                <p class="font-medium">{pkg.packageQuantity} {pkg.packageUnit}</p>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    </Card>
  {/if}

  <!-- Processing Time -->
  {#if audit?.processingTime}
    <Card variant="elevated" padding="md" class="animate-slide-in [animation-delay:200ms]">
      <h2 class="h3 mb-3">Processing Metrics</h2>
      <p class="text-sm text-surface-600-300">
        Processing Time: <span class="font-semibold">{audit.processingTime}ms</span>
      </p>
    </Card>
  {/if}

  <!-- Existing Notes -->
  {#if item.reviewQueueItem.notes}
    <Card variant="elevated" padding="md" class="animate-slide-in [animation-delay:250ms]">
      <h2 class="h3 mb-4">Review Notes</h2>
      <div class="variant-soft-surface rounded-container-token p-4 text-sm whitespace-pre-wrap">
        {item.reviewQueueItem.notes}
      </div>
    </Card>
  {/if}
</div>
