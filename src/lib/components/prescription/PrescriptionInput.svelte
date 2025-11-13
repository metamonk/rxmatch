<script lang="ts">
  import { Button, Card } from '$lib/components/ui';

  interface Props {
    onsubmit?: (event: { prescriptionText: string }) => void;
    onfileUpload?: (event: { file: File }) => void;
  }

  let { onsubmit, onfileUpload }: Props = $props();

  let prescriptionText = $state('');
  let isSubmitting = $state(false);
  let validationError = $state('');
  let fileInput: HTMLInputElement;

  function validateInput(): boolean {
    if (!prescriptionText.trim()) {
      validationError = 'Please enter a prescription or upload a file';
      return false;
    }

    if (prescriptionText.trim().length < 10) {
      validationError = 'Prescription text seems too short. Please provide more details.';
      return false;
    }

    validationError = '';
    return true;
  }

  function handleSubmit() {
    if (!validateInput()) {
      return;
    }

    isSubmitting = true;
    onsubmit?.({ prescriptionText: prescriptionText.trim() });

    // Reset submitting state after a delay (in real app, this would be controlled by parent)
    setTimeout(() => {
      isSubmitting = false;
    }, 500);
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    // Validate file type
    const validTypes = ['text/plain', 'application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      validationError = 'Please upload a valid file (TXT, PDF, JPG, or PNG)';
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      validationError = 'File size must be less than 5MB';
      return;
    }

    validationError = '';

    // For text files, read the content
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        prescriptionText = e.target?.result as string;
      };
      reader.readAsText(file);
    } else {
      // For images/PDFs, dispatch the file for OCR processing
      onfileUpload?.({ file });
    }
  }

  function handleClear() {
    prescriptionText = '';
    validationError = '';
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Allow Ctrl+Enter or Cmd+Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

<div class="prescription-input w-full max-w-4xl mx-auto animate-fade-in">
  <Card variant="elevated" padding="lg">
    <header class="mb-8">
      <h2 class="h2 gradient-heading mb-3">
        Enter Prescription
      </h2>
      <p class="text-surface-600-300 text-base">
        Enter prescription details below or upload a prescription image/file for processing.
      </p>
    </header>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <!-- Textarea Input -->
      <div class="form-group">
        <label class="label mb-3">
          <span class="text-base font-semibold">
            Prescription Details
            <span class="text-error-500" aria-label="required">*</span>
          </span>
        </label>
        <textarea
          id="prescription-text"
          bind:value={prescriptionText}
          onkeydown={handleKeydown}
          placeholder="Example: Lisinopril 10mg tablets, take 1 tablet by mouth daily, 90 tablets"
          rows="6"
          class="textarea transition-all duration-250 resize-y min-h-[150px] {validationError ? 'input-error' : ''}"
          aria-describedby="prescription-help"
          aria-invalid={!!validationError}
          disabled={isSubmitting}
        ></textarea>
        <p id="prescription-help" class="mt-3 text-sm text-surface-600-300 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Include drug name, strength, form, quantity, and directions. Press <kbd class="kbd kbd-sm">Ctrl+Enter</kbd> to submit.
        </p>
      </div>

      <!-- File Upload -->
      <div class="form-group">
        <label class="label mb-3">
          <span class="text-base font-semibold">Or Upload Prescription File</span>
        </label>
        <input
          id="prescription-file"
          bind:this={fileInput}
          type="file"
          accept=".txt,.pdf,.jpg,.jpeg,.png"
          onchange={handleFileChange}
          class="input transition-all duration-250"
          aria-describedby="file-help"
          disabled={isSubmitting}
        />
        <p id="file-help" class="mt-3 text-sm text-surface-600-300 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Supported formats: TXT, PDF, JPG, PNG (Max 5MB)
        </p>
      </div>

      <!-- Validation Error -->
      {#if validationError}
        <div
          role="alert"
          class="alert variant-filled-error animate-slide-in"
        >
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <div class="alert-message">
            <h3 class="h4">Validation Error</h3>
            <p>{validationError}</p>
          </div>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex items-center gap-4 pt-6">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          class="px-8"
        >
          {#if isSubmitting}
            <span class="flex items-center gap-2">
              <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          {:else}
            Parse Prescription
            <svg class="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          {/if}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="lg"
          onclick={handleClear}
          disabled={isSubmitting}
        >
          Clear
        </Button>
      </div>

      <!-- Example Prescriptions -->
      <details class="mt-8">
        <summary class="cursor-pointer text-base font-semibold text-surface-600-300 hover:text-primary-500 transition-all duration-250 flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Show Example Prescriptions
        </summary>
        <div class="mt-4 space-y-3">
          <button
            type="button"
            onclick={() => prescriptionText = 'Lisinopril 10mg tablets\nTake 1 tablet by mouth daily\n90 tablets\n90 days supply'}
            class="btn variant-soft-surface w-full text-left justify-start transition-all duration-250 hover:scale-[1.01]"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span><strong>Example 1:</strong> Lisinopril 10mg tablets, 1 daily, 90 tablets</span>
          </button>
          <button
            type="button"
            onclick={() => prescriptionText = 'Metformin 500mg tablets\nTake 1 tablet twice daily with meals\n60 tablets\n30 days supply'}
            class="btn variant-soft-surface w-full text-left justify-start transition-all duration-250 hover:scale-[1.01]"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span><strong>Example 2:</strong> Metformin 500mg tablets, twice daily, 60 tablets</span>
          </button>
          <button
            type="button"
            onclick={() => prescriptionText = 'Amoxicillin 500mg capsules\nTake 1 capsule three times daily\n30 capsules\n10 days supply'}
            class="btn variant-soft-surface w-full text-left justify-start transition-all duration-250 hover:scale-[1.01]"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span><strong>Example 3:</strong> Amoxicillin 500mg capsules, three times daily, 30 capsules</span>
          </button>
        </div>
      </details>
    </form>
  </Card>
</div>
