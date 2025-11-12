<script lang="ts">
  import type { ReviewQueueItemWithDetails } from '$lib/types/review';
  import type { PrescriptionParse } from '$lib/types/prescription';

  interface Props {
    item: ReviewQueueItemWithDetails;
  }

  let { item }: Props = $props();

  const audit = $derived(item.calculationAudit);
  const parsedResult = $derived(audit?.parsedResult as PrescriptionParse | null);
  const selectedPackages = $derived(audit?.selectedPackages as any[] | null);

  function getConfidenceClass(score: number | null | undefined): string {
    if (!score) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  }

  function formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
</script>

<div class="space-y-6">
  <!-- Header with Metadata -->
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</h3>
        <p class="mt-1 text-sm font-semibold text-gray-900">
          {item.reviewQueueItem.priority}
        </p>
      </div>
      <div>
        <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</h3>
        <p class="mt-1 text-sm font-semibold text-gray-900">
          {item.reviewQueueItem.status.replace('_', ' ')}
        </p>
      </div>
      <div>
        <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</h3>
        <p class="mt-1 text-sm text-gray-900">
          {formatDate(item.reviewQueueItem.createdAt)}
        </p>
      </div>
      <div>
        <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</h3>
        <p class="mt-1 text-sm text-gray-900">
          {#if item.assignedUser}
            {item.assignedUser.displayName || item.assignedUser.email}
          {:else}
            <span class="text-gray-500 italic">Unassigned</span>
          {/if}
        </p>
      </div>
    </div>
  </div>

  <!-- Original Prescription Text -->
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Original Prescription Text</h2>
    <div class="bg-gray-50 rounded-md p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap">
      {audit?.prescriptionText || 'No prescription text available'}
    </div>
  </div>

  <!-- Parsed Prescription Data -->
  {#if parsedResult}
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900">Parsed Prescription Data</h2>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">Confidence:</span>
          <span class="text-lg font-bold {getConfidenceClass(audit?.confidenceScore)}">
            {audit?.confidenceScore ? `${(audit.confidenceScore * 100).toFixed(1)}%` : 'N/A'}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-2">Drug Name</h3>
          <p class="text-gray-900">{parsedResult.drugName}</p>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-2">Strength</h3>
          <p class="text-gray-900">{parsedResult.strength}</p>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-2">Form</h3>
          <p class="text-gray-900">{parsedResult.form}</p>
        </div>

        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-2">Quantity</h3>
          <p class="text-gray-900">{parsedResult.quantity}</p>
        </div>

        {#if parsedResult.sig}
          <div class="md:col-span-2">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Sig (Instructions)</h3>
            <p class="text-gray-900">{parsedResult.sig}</p>
          </div>
        {/if}

        {#if parsedResult.daysSupply}
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">Days Supply</h3>
            <p class="text-gray-900">{parsedResult.daysSupply} days</p>
          </div>
        {/if}

        {#if parsedResult.normalizations?.originalDrugName}
          <div class="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <h3 class="text-sm font-medium text-yellow-800 mb-1">Normalizations Applied</h3>
            <p class="text-sm text-yellow-700">
              Original: <span class="font-mono">{parsedResult.normalizations.originalDrugName}</span>
            </p>
            {#if parsedResult.normalizations.spellingCorrections && parsedResult.normalizations.spellingCorrections.length > 0}
              <p class="text-sm text-yellow-700 mt-1">
                Corrections: {parsedResult.normalizations.spellingCorrections.join(', ')}
              </p>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- RxNorm/RxCUI Information -->
  {#if audit?.rxcui}
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">RxNorm Information</h2>
      <div class="space-y-3">
        <div>
          <h3 class="text-sm font-medium text-gray-700">RxCUI</h3>
          <p class="text-gray-900 font-mono">{audit.rxcui}</p>
        </div>
        {#if audit.ndcCodes && Array.isArray(audit.ndcCodes) && audit.ndcCodes.length > 0}
          <div>
            <h3 class="text-sm font-medium text-gray-700 mb-2">NDC Codes Found</h3>
            <div class="flex flex-wrap gap-2">
              {#each audit.ndcCodes as ndc}
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  {ndc}
                </span>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Selected Packages -->
  {#if selectedPackages && selectedPackages.length > 0}
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Selected Packages</h2>
      <div class="space-y-4">
        {#each selectedPackages as pkg}
          <div class="bg-gray-50 rounded-md p-4 border border-gray-200">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <h4 class="text-sm font-medium text-gray-700">NDC</h4>
                <p class="text-gray-900 font-mono">{pkg.ndc}</p>
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-700">Labeler</h4>
                <p class="text-gray-900">{pkg.labelerName}</p>
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-700">Package Description</h4>
                <p class="text-gray-900">{pkg.packageDescription}</p>
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-700">Quantity</h4>
                <p class="text-gray-900">{pkg.packageQuantity} {pkg.packageUnit}</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Processing Time -->
  {#if audit?.processingTime}
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Processing Metrics</h2>
      <p class="text-sm text-gray-600">
        Processing Time: <span class="font-medium text-gray-900">{audit.processingTime}ms</span>
      </p>
    </div>
  {/if}

  <!-- Existing Notes -->
  {#if item.reviewQueueItem.notes}
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Review Notes</h2>
      <div class="bg-gray-50 rounded-md p-4 text-sm text-gray-800 whitespace-pre-wrap">
        {item.reviewQueueItem.notes}
      </div>
    </div>
  {/if}
</div>
