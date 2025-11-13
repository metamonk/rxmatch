<script lang="ts">
  import type { PrescriptionParse } from '$lib/types/prescription';
  import { exportParsedPrescription } from '$lib/utils/export';
  import { Button, Card, Badge } from '$lib/components/ui';

  interface Props {
    result: PrescriptionParse;
  }

  let { result }: Props = $props();

  function handleExport(format: 'json' | 'csv') {
    exportParsedPrescription(result, format);
  }

  function getConfidenceBadge(confidence: number): { variant: 'success' | 'primary' | 'warning' | 'error'; label: string } {
    if (confidence >= 0.95) {
      return { variant: 'success', label: 'High Confidence' };
    } else if (confidence >= 0.85) {
      return { variant: 'primary', label: 'Good Confidence' };
    } else if (confidence >= 0.75) {
      return { variant: 'warning', label: 'Medium Confidence' };
    } else {
      return { variant: 'error', label: 'Low Confidence' };
    }
  }

  const confidenceBadge = $derived(getConfidenceBadge(result.confidence));
</script>

<div class="parsed-results w-full max-w-4xl mx-auto animate-fade-in">
  <Card variant="elevated" padding="lg">
    <header class="mb-8">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h2 class="h2 gradient-heading mb-3">
            Parsed Prescription
          </h2>
          <p class="text-surface-600-300 text-base">
            Review the extracted prescription details below
          </p>
        </div>
        <Badge
          variant={confidenceBadge.variant}
          size="lg"
          class="animate-slide-in"
        >
          {confidenceBadge.label}
        </Badge>
      </div>

      <!-- Export Buttons -->
      <div class="flex items-center gap-4">
        <span class="text-sm text-surface-600-300 font-semibold uppercase tracking-wide">Export:</span>
        <Button
          variant="primary"
          size="sm"
          onclick={() => handleExport('json')}
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          JSON
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onclick={() => handleExport('csv')}
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          CSV
        </Button>
      </div>
    </header>

    <!-- Confidence Score Details -->
    <Card variant="outlined" padding="md" class="mb-6 border-primary-500/30 bg-primary-50/10 animate-slide-in">
      <div class="flex items-center justify-between mb-3">
        <span class="text-base font-semibold">Parsing Confidence</span>
        <span class="text-2xl font-bold text-primary-500">{(result.confidence * 100).toFixed(1)}%</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-bar-meter transition-all duration-500 {result.confidence >= 0.95 ? 'bg-success-500' : result.confidence >= 0.85 ? 'bg-primary-500' : result.confidence >= 0.75 ? 'bg-warning-500' : 'bg-error-500'}"
          style="width: {result.confidence * 100}%"
          role="progressbar"
          aria-valuenow={result.confidence * 100}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Confidence score"
        ></div>
      </div>
      {#if result.confidence < 0.85}
        <div class="alert variant-soft-warning mt-4">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <p class="alert-message">Please verify the details below carefully</p>
        </div>
      {/if}
    </Card>

    <!-- Normalizations/Corrections -->
    {#if result.normalizations && (result.normalizations.spellingCorrections?.length || result.normalizations.originalDrugName !== result.drugName)}
      <div class="alert variant-soft-primary mb-6 animate-slide-in [animation-delay:100ms]">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <div class="alert-message">
          <h3 class="h4 mb-2">Corrections Applied</h3>
          {#if result.normalizations.originalDrugName && result.normalizations.originalDrugName !== result.drugName}
            <p>
              Original: <code class="code line-through">{result.normalizations.originalDrugName}</code>
              → Corrected: <code class="code font-bold">{result.drugName}</code>
            </p>
          {/if}
          {#if result.normalizations.spellingCorrections?.length}
            <ul class="list mt-2">
              {#each result.normalizations.spellingCorrections as correction}
                <li><span class="badge-icon variant-soft-primary mr-2">✓</span>{correction}</li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Main Details Grid -->
    <div class="grid gap-6 md:grid-cols-2 animate-slide-in [animation-delay:150ms]">
      <!-- Drug Name -->
      <Card variant="outlined" padding="md" class="border-primary-500/20 hover:border-primary-500/40 transition-all duration-250">
        <span class="text-sm font-semibold text-surface-600-300 uppercase tracking-wide mb-2 block">
          Drug Name
        </span>
        <p class="text-xl font-bold text-primary-500">
          {result.drugName}
        </p>
      </Card>

      <!-- Strength -->
      <Card variant="outlined" padding="md" class="border-secondary-500/20 hover:border-secondary-500/40 transition-all duration-250">
        <span class="text-sm font-semibold text-surface-600-300 uppercase tracking-wide mb-2 block">
          Strength
        </span>
        <p class="text-xl font-bold text-secondary-500">
          {result.strength}
        </p>
      </Card>

      <!-- Form -->
      <Card variant="outlined" padding="md" class="border-tertiary-500/20 hover:border-tertiary-500/40 transition-all duration-250">
        <span class="text-sm font-semibold text-surface-600-300 uppercase tracking-wide mb-2 block">
          Dosage Form
        </span>
        <p class="text-xl font-bold capitalize">
          {result.form}
        </p>
      </Card>

      <!-- Quantity -->
      <Card variant="outlined" padding="md" class="border-success-500/20 hover:border-success-500/40 transition-all duration-250">
        <span class="text-sm font-semibold text-surface-600-300 uppercase tracking-wide mb-2 block">
          Quantity
        </span>
        <p class="text-xl font-bold text-success-500">
          {result.quantity} {result.form}{result.quantity !== 1 ? 's' : ''}
        </p>
      </Card>

      <!-- Days Supply (if present) -->
      {#if result.daysSupply}
        <Card variant="outlined" padding="md" class="border-warning-500/20 hover:border-warning-500/40 transition-all duration-250">
          <span class="text-sm font-semibold text-surface-600-300 uppercase tracking-wide mb-2 block">
            Days Supply
          </span>
          <p class="text-xl font-bold text-warning-500">
            {result.daysSupply} days
          </p>
        </Card>
      {/if}
    </div>

    <!-- Sig (Directions) -->
    {#if result.sig}
      <Card variant="outlined" padding="md" class="mt-8 border-surface-300-600 animate-slide-in [animation-delay:200ms]">
        <div class="flex items-start gap-3">
          <div class="variant-soft-primary p-2 rounded-container-token">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <span class="block text-sm font-semibold text-surface-600-300 uppercase tracking-wide mb-2">
              Directions for Use (Sig)
            </span>
            <p class="text-base leading-relaxed">
              {result.sig}
            </p>
          </div>
        </div>
      </Card>
    {/if}

    <!-- Action Hint -->
    <div class="alert variant-soft-primary mt-8 animate-slide-in [animation-delay:250ms]">
      <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
      </svg>
      <p class="alert-message">
        Next, we'll search for matching NDC packages and recommend the best options.
      </p>
    </div>
  </Card>
</div>
