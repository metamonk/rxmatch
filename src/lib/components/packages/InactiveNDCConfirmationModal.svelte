<script lang="ts">
  import type { NDCPackage } from '$lib/types/medication';
  import { formatExpirationDate } from '$lib/utils/fda';

  interface Props {
    package: NDCPackage;
    isopen: boolean;
    onconfirm?: () => void;
    oncancel?: () => void;
  }

  let { package: pkg, isopen, onconfirm, oncancel }: Props = $props();

  let acknowledged = $state(false);

  // Reset acknowledgment when modal opens
  $effect(() => {
    if (isopen) {
      acknowledged = false;
    }
  });

  function handleConfirm() {
    if (acknowledged) {
      onconfirm?.();
    }
  }

  function handleCancel() {
    oncancel?.();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }

  const formattedExpiration = $derived(formatExpirationDate(pkg.expirationDate));
</script>

{#if isopen}
  <!-- Modal Backdrop -->
  <div
    class="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    onkeydown={handleKeyDown}
    role="button"
    tabindex="-1"
    aria-label="Close modal"
  >
    <!-- Modal Content -->
    <div
      class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.key === 'Enter' && acknowledged && handleConfirm()}
    >
      <!-- Modal Header -->
      <div class="bg-red-50 px-6 py-4 border-b border-red-200">
        <div class="flex items-start gap-4">
          <!-- Warning Icon -->
          <div class="flex-shrink-0 mt-1">
            <svg
              class="w-10 h-10 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>

          <div class="flex-1">
            <h2 id="modal-title" class="text-xl font-bold text-red-900">
              Inactive NDC Warning
            </h2>
            <p class="text-red-700 text-sm mt-1">
              This NDC code is no longer actively marketed
            </p>
          </div>

          <!-- Close Button -->
          <button
            type="button"
            onclick={handleCancel}
            class="text-red-400 hover:text-red-600 transition-colors"
            aria-label="Close modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="px-6 py-6 space-y-6">
        <!-- Package Information -->
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-3">Selected Package</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-gray-500">NDC Code</dt>
              <dd class="font-mono font-medium text-gray-900">{pkg.ndc}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Drug Name</dt>
              <dd class="font-medium text-gray-900">{pkg.genericName}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Manufacturer</dt>
              <dd class="text-gray-900">{pkg.labelerName}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Package</dt>
              <dd class="text-gray-900">{pkg.packageDescription}</dd>
            </div>
            {#if formattedExpiration}
              <div class="sm:col-span-2">
                <dt class="text-gray-500">Listing Expired On</dt>
                <dd class="font-semibold text-red-700">{formattedExpiration}</dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Warning Message -->
        <div id="modal-description" class="space-y-4">
          <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <div class="text-sm text-red-900">
              <p class="font-semibold mb-2">Why This Matters</p>
              <p>
                An inactive NDC code means the product's listing has expired with the FDA.
                This typically indicates the product may be:
              </p>
            </div>
          </div>

          <ul class="space-y-2 ml-4">
            <li class="flex items-start gap-2 text-sm text-gray-700">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span><strong>Discontinued</strong> by the manufacturer</span>
            </li>
            <li class="flex items-start gap-2 text-sm text-gray-700">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span><strong>No longer available</strong> for purchase</span>
            </li>
            <li class="flex items-start gap-2 text-sm text-gray-700">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span><strong>Out of stock</strong> at pharmacies</span>
            </li>
            <li class="flex items-start gap-2 text-sm text-gray-700">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span><strong>Reformulated</strong> under a different NDC</span>
            </li>
          </ul>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-sm text-yellow-900">
              <strong>Recommendation:</strong> Consider selecting an active NDC package to ensure
              availability and avoid prescription fulfillment issues.
            </p>
          </div>
        </div>

        <!-- Acknowledgment Checkbox -->
        <div class="border-t border-gray-200 pt-6">
          <label class="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              bind:checked={acknowledged}
              class="mt-1 w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
              aria-describedby="acknowledgment-text"
            />
            <span
              id="acknowledgment-text"
              class="text-sm text-gray-900 group-hover:text-gray-700 select-none"
            >
              I understand this NDC may be unavailable or discontinued, and I accept the risk
              of potential prescription fulfillment issues.
            </span>
          </label>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
        <button
          type="button"
          onclick={handleCancel}
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onclick={handleConfirm}
          disabled={!acknowledged}
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-describedby="confirm-button-note"
        >
          Proceed with Inactive NDC
        </button>
        <span id="confirm-button-note" class="sr-only">
          This button is enabled only after acknowledging the warning
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Prevent body scroll when modal is open */
  :global(body:has(.fixed)) {
    overflow: hidden;
  }
</style>
