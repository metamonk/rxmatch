<script lang="ts">
  import type { PrescriptionParse } from '$lib/types/prescription';
  import { exportParsedPrescription } from '$lib/utils/export';

  interface Props {
    result: PrescriptionParse;
  }

  let { result }: Props = $props();

  function handleExport(format: 'json' | 'csv') {
    exportParsedPrescription(result, format);
  }

  function getConfidenceBadge(confidence: number): { class: string; label: string } {
    if (confidence >= 0.95) {
      return { class: 'bg-green-100 text-green-800 border-green-200', label: 'High Confidence' };
    } else if (confidence >= 0.85) {
      return { class: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Good Confidence' };
    } else if (confidence >= 0.75) {
      return { class: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium Confidence' };
    } else {
      return { class: 'bg-red-100 text-red-800 border-red-200', label: 'Low Confidence' };
    }
  }

  const confidenceBadge = $derived(getConfidenceBadge(result.confidence));
</script>

<div class="parsed-results w-full max-w-4xl mx-auto">
  <div class="card bg-white shadow-lg rounded-lg p-6">
    <header class="mb-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Parsed Prescription
          </h2>
          <p class="text-gray-600">
            Review the extracted prescription details below
          </p>
        </div>
        <span
          class="px-3 py-1 border rounded-full text-sm font-medium {confidenceBadge.class}"
          role="status"
          aria-label="Confidence level: {confidenceBadge.label}"
        >
          {confidenceBadge.label}
        </span>
      </div>

      <!-- Export Buttons -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600 font-medium">Export:</span>
        <button
          onclick={() => handleExport('json')}
          class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          aria-label="Export as JSON"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          JSON
        </button>
        <button
          onclick={() => handleExport('csv')}
          class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          aria-label="Export as CSV"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          CSV
        </button>
      </div>
    </header>

    <!-- Confidence Score Details -->
    <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">Parsing Confidence</span>
        <span class="text-sm font-bold text-gray-900">{(result.confidence * 100).toFixed(1)}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="h-2 rounded-full transition-all duration-500 {result.confidence >= 0.95 ? 'bg-green-500' : result.confidence >= 0.85 ? 'bg-blue-500' : result.confidence >= 0.75 ? 'bg-yellow-500' : 'bg-red-500'}"
          style="width: {result.confidence * 100}%"
          role="progressbar"
          aria-valuenow={result.confidence * 100}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Confidence score"
        ></div>
      </div>
      {#if result.confidence < 0.85}
        <p class="mt-2 text-sm text-yellow-700">
          <svg class="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          Please verify the details below carefully
        </p>
      {/if}
    </div>

    <!-- Normalizations/Corrections -->
    {#if result.normalizations && (result.normalizations.spellingCorrections?.length || result.normalizations.originalDrugName !== result.drugName)}
      <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg" role="alert">
        <h3 class="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          Corrections Applied
        </h3>
        {#if result.normalizations.originalDrugName && result.normalizations.originalDrugName !== result.drugName}
          <p class="text-sm text-blue-800">
            Original: <span class="font-mono line-through">{result.normalizations.originalDrugName}</span>
            → Corrected: <span class="font-mono font-semibold">{result.drugName}</span>
          </p>
        {/if}
        {#if result.normalizations.spellingCorrections?.length}
          <ul class="mt-2 text-sm text-blue-800 list-disc list-inside">
            {#each result.normalizations.spellingCorrections as correction}
              <li>{correction}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}

    <!-- Main Details Grid -->
    <div class="grid gap-6 md:grid-cols-2">
      <!-- Drug Name -->
      <div class="detail-item">
        <span class="block text-sm font-medium text-gray-500 mb-1">
          Drug Name
        </span>
        <p class="text-lg font-semibold text-gray-900">
          {result.drugName}
        </p>
      </div>

      <!-- Strength -->
      <div class="detail-item">
        <span class="block text-sm font-medium text-gray-500 mb-1">
          Strength
        </span>
        <p class="text-lg font-semibold text-gray-900">
          {result.strength}
        </p>
      </div>

      <!-- Form -->
      <div class="detail-item">
        <span class="block text-sm font-medium text-gray-500 mb-1">
          Dosage Form
        </span>
        <p class="text-lg font-semibold text-gray-900 capitalize">
          {result.form}
        </p>
      </div>

      <!-- Quantity -->
      <div class="detail-item">
        <span class="block text-sm font-medium text-gray-500 mb-1">
          Quantity
        </span>
        <p class="text-lg font-semibold text-gray-900">
          {result.quantity} {result.form}{result.quantity !== 1 ? 's' : ''}
        </p>
      </div>

      <!-- Days Supply (if present) -->
      {#if result.daysSupply}
        <div class="detail-item">
          <span class="block text-sm font-medium text-gray-500 mb-1">
            Days Supply
          </span>
          <p class="text-lg font-semibold text-gray-900">
            {result.daysSupply} days
          </p>
        </div>
      {/if}
    </div>

    <!-- Sig (Directions) -->
    {#if result.sig}
      <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <span class="block text-sm font-medium text-gray-700 mb-2">
          Directions for Use (Sig)
        </span>
        <p class="text-gray-900 leading-relaxed">
          {result.sig}
        </p>
      </div>
    {/if}

    <!-- Action Hint -->
    <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <p class="text-sm text-blue-900">
        <svg class="inline w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        Next, we'll search for matching NDC packages and recommend the best options.
      </p>
    </div>
  </div>
</div>

<style>
  /* Additional custom styles if needed */
</style>
