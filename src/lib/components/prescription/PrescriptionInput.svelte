<script lang="ts">
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

<div class="prescription-input w-full max-w-4xl mx-auto">
  <div class="card bg-white shadow-lg rounded-lg p-6">
    <header class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">
        Enter Prescription
      </h2>
      <p class="text-gray-600">
        Enter prescription details below or upload a prescription image/file for processing.
      </p>
    </header>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <!-- Textarea Input -->
      <div class="form-group">
        <label for="prescription-text" class="block text-sm font-medium text-gray-700 mb-2">
          Prescription Details
          <span class="text-red-600" aria-label="required">*</span>
        </label>
        <textarea
          id="prescription-text"
          bind:value={prescriptionText}
          onkeydown={handleKeydown}
          placeholder="Example: Lisinopril 10mg tablets, take 1 tablet by mouth daily, 90 tablets"
          rows="6"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-y min-h-[120px]"
          aria-describedby="prescription-help"
          aria-invalid={!!validationError}
          disabled={isSubmitting}
        ></textarea>
        <p id="prescription-help" class="mt-2 text-sm text-gray-500">
          Include drug name, strength, form, quantity, and directions (Sig).
          Press Ctrl+Enter to submit.
        </p>
      </div>

      <!-- File Upload -->
      <div class="form-group">
        <label for="prescription-file" class="block text-sm font-medium text-gray-700 mb-2">
          Or Upload Prescription File
        </label>
        <div class="flex items-center gap-3">
          <input
            id="prescription-file"
            bind:this={fileInput}
            type="file"
            accept=".txt,.pdf,.jpg,.jpeg,.png"
            onchange={handleFileChange}
            class="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
            aria-describedby="file-help"
            disabled={isSubmitting}
          />
        </div>
        <p id="file-help" class="mt-2 text-sm text-gray-500">
          Supported formats: TXT, PDF, JPG, PNG (Max 5MB)
        </p>
      </div>

      <!-- Validation Error -->
      {#if validationError}
        <div
          role="alert"
          class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3"
        >
          <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <span>{validationError}</span>
        </div>
      {/if}

      <!-- Action Buttons -->
      <div class="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          aria-busy={isSubmitting}
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
          {/if}
        </button>

        <button
          type="button"
          onclick={handleClear}
          disabled={isSubmitting}
          class="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
      </div>

      <!-- Example Prescriptions -->
      <details class="mt-6">
        <summary class="cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
          Show Example Prescriptions
        </summary>
        <div class="mt-3 space-y-2 text-sm">
          <button
            type="button"
            onclick={() => prescriptionText = 'Lisinopril 10mg tablets\nTake 1 tablet by mouth daily\n90 tablets\n90 days supply'}
            class="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
          >
            <strong class="text-gray-900">Example 1:</strong> Lisinopril 10mg tablets, 1 daily, 90 tablets
          </button>
          <button
            type="button"
            onclick={() => prescriptionText = 'Metformin 500mg tablets\nTake 1 tablet twice daily with meals\n60 tablets\n30 days supply'}
            class="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
          >
            <strong class="text-gray-900">Example 2:</strong> Metformin 500mg tablets, twice daily, 60 tablets
          </button>
          <button
            type="button"
            onclick={() => prescriptionText = 'Amoxicillin 500mg capsules\nTake 1 capsule three times daily\n30 capsules\n10 days supply'}
            class="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors"
          >
            <strong class="text-gray-900">Example 3:</strong> Amoxicillin 500mg capsules, three times daily, 30 capsules
          </button>
        </div>
      </details>
    </form>
  </div>
</div>

<style>
  /* Additional custom styles if needed */
</style>
