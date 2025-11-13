<script lang="ts">
  import type { NDCPackage, PackageRecommendation, CalculationResult } from '$lib/types/medication';
  import type { PrescriptionParse } from '$lib/types/prescription';
  import { exportFullResults } from '$lib/utils/export';
  import InactiveNDCConfirmationModal from './InactiveNDCConfirmationModal.svelte';
  import { formatExpirationDate } from '$lib/utils/fda';
  import { Button, Card, Badge } from '$lib/components/ui';

  interface Props {
    packages: NDCPackage[];
    recommendations: PackageRecommendation[];
    warnings?: string[];
    prescriptionParse?: PrescriptionParse;
    calculationResult?: CalculationResult;
    onselect?: (event: { ndc: string; package: NDCPackage }) => void;
  }

  let { packages, recommendations, warnings, prescriptionParse, calculationResult, onselect }: Props = $props();

  let selectedNdc = $state<string | null>(null);
  let filterInactive = $state(true);
  let showInactiveModal = $state(false);
  let pendingSelection = $state<{ ndc: string; package: NDCPackage } | null>(null);

  const inactivePackages = $derived(packages.filter(pkg => !pkg.isActive));
  const inactiveCount = $derived(inactivePackages.length);

  const filteredPackages = $derived(
    filterInactive ? packages.filter(pkg => pkg.isActive) : packages
  );

  function getEfficiencyBadge(efficiency: string): { variant: 'success' | 'primary' | 'warning' | 'info'; label: string; icon: string } {
    switch (efficiency) {
      case 'optimal':
        return {
          variant: 'success',
          label: 'Optimal',
          icon: '✓'
        };
      case 'acceptable':
        return {
          variant: 'primary',
          label: 'Acceptable',
          icon: '~'
        };
      case 'wasteful':
        return {
          variant: 'warning',
          label: 'Wasteful',
          icon: '!'
        };
      default:
        return {
          variant: 'info',
          label: 'Unknown',
          icon: '?'
        };
    }
  }

  function handleSelect(ndc: string, pkg: NDCPackage) {
    // Check if the package is inactive - require acknowledgment
    if (!pkg.isActive) {
      pendingSelection = { ndc, package: pkg };
      showInactiveModal = true;
      return;
    }

    // Active package - select immediately
    selectedNdc = ndc;
    onselect?.({ ndc, package: pkg });
  }

  function confirmInactiveSelection() {
    if (pendingSelection) {
      selectedNdc = pendingSelection.ndc;
      onselect?.(pendingSelection);
      showInactiveModal = false;
      pendingSelection = null;
    }
  }

  function cancelInactiveSelection() {
    showInactiveModal = false;
    pendingSelection = null;
  }

  function getRecommendationForPackage(ndc: string): PackageRecommendation | undefined {
    return recommendations.find(rec => rec.ndc === ndc);
  }

  function handleExport(format: 'json' | 'csv') {
    if (!prescriptionParse || !calculationResult) {
      console.warn('Cannot export: Missing prescription or calculation data');
      return;
    }
    exportFullResults(prescriptionParse, calculationResult, format, selectedNdc || undefined);
  }
</script>

<div class="package-selector w-full max-w-6xl mx-auto animate-fade-in">
  <Card variant="elevated" padding="lg">
    <header class="mb-8">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h2 class="h2 gradient-heading mb-3">
            Available NDC Packages
          </h2>
          <p class="text-surface-600-300 text-base">
            Select the best package option based on quantity needs and cost efficiency
          </p>
        </div>
      </div>

      <!-- Export Buttons -->
      {#if prescriptionParse && calculationResult}
        <div class="flex items-center gap-4">
          <span class="text-sm text-surface-600-300 font-semibold uppercase tracking-wide">Export Results:</span>
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
          {#if selectedNdc}
            <span class="text-xs text-surface-500-400 ml-2">(includes selected package)</span>
          {/if}
        </div>
      {/if}
    </header>

    <!-- Warnings Section -->
    {#if warnings && warnings.length > 0}
      <div class="mb-6 space-y-3 animate-slide-in">
        {#each warnings as warning}
          <div
            role="alert"
            class="alert variant-filled-warning"
          >
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <p class="alert-message">{warning}</p>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Inactive NDC Warning Banner -->
    {#if inactiveCount > 0 && !filterInactive}
      <div
        role="alert"
        class="alert variant-filled-error mb-6 animate-slide-in [animation-delay:50ms]"
      >
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="alert-message">
          <h3 class="h4 mb-2">
            {inactiveCount} Inactive NDC{inactiveCount !== 1 ? 's' : ''} Detected
          </h3>
          <p class="text-sm">
            Some NDC codes in this list are no longer actively marketed and may be discontinued or unavailable.
            Selecting an inactive NDC may result in prescription fulfillment issues.
            <strong class="block mt-2">You will be required to acknowledge this risk before selecting an inactive NDC.</strong>
          </p>
        </div>
      </div>
    {/if}

    <!-- Filter Controls -->
    <div class="mb-6 flex items-center gap-4 animate-slide-in [animation-delay:100ms]">
      <label class="label flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          bind:checked={filterInactive}
          class="checkbox"
        />
        <span class="text-sm font-medium">Hide inactive NDC codes</span>
      </label>
      <span class="text-sm text-surface-500-400 font-medium">
        ({filteredPackages.length} of {packages.length} packages shown)
      </span>
    </div>

    <!-- Packages Grid -->
    {#if filteredPackages.length === 0}
      <Card variant="outlined" padding="lg" class="text-center animate-fade-in">
        <svg class="mx-auto h-12 w-12 text-surface-400-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 class="h3 mt-4">No Packages Available</h3>
        <p class="mt-2 text-surface-600-300">
          {filterInactive ? 'Try showing inactive NDC codes' : 'No NDC packages found for this prescription'}
        </p>
      </Card>
    {:else}
      <div class="space-y-4 animate-slide-in [animation-delay:150ms]">
        {#each filteredPackages as pkg (pkg.ndc)}
          {@const recommendation = getRecommendationForPackage(pkg.ndc)}
          {@const isSelected = selectedNdc === pkg.ndc}
          {@const efficiencyBadge = recommendation ? getEfficiencyBadge(recommendation.costEfficiency) : null}

          <Card
            variant="outlined"
            padding="md"
            class="package-card transition-all duration-250 {isSelected ? 'border-primary-500 !bg-primary-50/30 shadow-lg scale-[1.01]' : pkg.isActive ? 'border-surface-300-600 hover:border-primary-500/40 hover:shadow-md' : 'border-error-500/40 !bg-error-50/20'}"
          >
            <div class="flex items-start justify-between gap-4">
              <!-- Package Info -->
              <div class="flex-1">
                <div class="flex items-start gap-3 mb-3">
                  <!-- Select Radio -->
                  <input
                    type="radio"
                    name="package-selection"
                    id="package-{pkg.ndc}"
                    value={pkg.ndc}
                    checked={isSelected}
                    onchange={() => handleSelect(pkg.ndc, pkg)}
                    class="radio mt-1"
                    aria-describedby="package-{pkg.ndc}-description"
                  />

                  <div class="flex-1">
                    <label for="package-{pkg.ndc}" class="cursor-pointer">
                      <div class="flex items-center gap-2 mb-2">
                        <h3 class="text-lg font-semibold">
                          {pkg.genericName || 'Unknown Drug'}
                        </h3>
                        {#if !pkg.isActive}
                          <Badge variant="error" size="sm">
                            Inactive
                          </Badge>
                        {/if}
                        {#if efficiencyBadge}
                          <Badge variant={efficiencyBadge.variant} size="sm">
                            {efficiencyBadge.icon} {efficiencyBadge.label}
                          </Badge>
                        {/if}
                      </div>

                      <p class="text-sm text-surface-600-300 mb-3">
                        {pkg.labelerName}
                        {#if pkg.brandName}
                          <span class="font-semibold">({pkg.brandName})</span>
                        {/if}
                      </p>

                      {#if !pkg.isActive && pkg.expirationDate}
                        {@const formattedExpiration = formatExpirationDate(pkg.expirationDate)}
                        {#if formattedExpiration}
                          <div class="mb-3 alert variant-soft-error !py-2 !px-3 text-xs">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                            </svg>
                            <span class="alert-message"><strong>Listing expired:</strong> {formattedExpiration}</span>
                          </div>
                        {/if}
                      {/if}

                      <div id="package-{pkg.ndc}-description" class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span class="text-surface-600-300 font-medium">NDC:</span>
                          <span class="font-mono ml-1">{pkg.ndc}</span>
                        </div>
                        <div>
                          <span class="text-surface-600-300 font-medium">Strength:</span>
                          <span class="ml-1">{pkg.strength}</span>
                        </div>
                        <div>
                          <span class="text-surface-600-300 font-medium">Form:</span>
                          <span class="ml-1 capitalize">{pkg.dosageForm.toLowerCase()}</span>
                        </div>
                        <div>
                          <span class="text-surface-600-300 font-medium">Route:</span>
                          <span class="ml-1 capitalize">{pkg.route.join(', ').toLowerCase()}</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Package Details -->
                <div class="ml-7 pl-4 border-l-2 border-surface-300-600 space-y-3">
                  <div class="text-sm">
                    <span class="font-semibold text-surface-600-300">Package:</span>
                    <span class="ml-2">{pkg.packageDescription}</span>
                  </div>

                  {#if recommendation}
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span class="text-surface-600-300 font-medium">Quantity Needed:</span>
                        <span class="font-bold ml-1">{recommendation.quantityNeeded}</span>
                      </div>
                      <div>
                        <span class="text-surface-600-300 font-medium">Packages:</span>
                        <span class="font-bold ml-1">{recommendation.packagesRequired}</span>
                      </div>
                      <div>
                        <span class="text-surface-600-300 font-medium">Total Units:</span>
                        <span class="font-bold ml-1">{recommendation.totalUnits}</span>
                      </div>
                      <div>
                        <span class="text-surface-600-300 font-medium">Overage:</span>
                        <span class="font-bold ml-1 {recommendation.overage === 0 ? 'text-success-500' : recommendation.overage <= 10 ? 'text-primary-500' : 'text-warning-500'}">
                          {recommendation.overage > 0 ? '+' : ''}{recommendation.overage}
                        </span>
                      </div>
                    </div>

                    {#if recommendation.overage > 20}
                      <p class="text-sm text-warning-700 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        High overage - consider a different package size
                      </p>
                    {/if}
                  {/if}
                </div>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}

    <!-- Selected Package Summary -->
    {#if selectedNdc}
      {@const selectedPkg = packages.find(p => p.ndc === selectedNdc)}
      {@const selectedRec = getRecommendationForPackage(selectedNdc)}
      {#if selectedPkg}
        <Card variant="outlined" padding="md" class="mt-6 border-primary-500/30 bg-primary-50/10 animate-slide-in">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-3">
                <svg class="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <h3 class="h4 text-primary-500">Selected Package</h3>
              </div>
              <p class="text-base mb-2">
                <span class="font-bold">{selectedPkg.genericName}</span>
                <span class="text-surface-600-300"> - {selectedPkg.packageDescription}</span>
              </p>
              <p class="text-sm text-surface-600-300">
                NDC: <span class="font-mono">{selectedPkg.ndc}</span>
                {#if selectedRec}
                  <span class="mx-2">•</span>
                  {selectedRec.packagesRequired} package{selectedRec.packagesRequired !== 1 ? 's' : ''} required
                {/if}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onclick={() => selectedNdc = null}
            >
              Clear
            </Button>
          </div>
        </Card>
      {/if}
    {/if}
  </Card>
</div>

<!-- Inactive NDC Confirmation Modal -->
{#if showInactiveModal && pendingSelection}
  <InactiveNDCConfirmationModal
    package={pendingSelection.package}
    isopen={showInactiveModal}
    onconfirm={confirmInactiveSelection}
    oncancel={cancelInactiveSelection}
  />
{/if}

<style>
  /* Additional custom styles if needed */
</style>
