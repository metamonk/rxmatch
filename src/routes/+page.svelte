<script lang="ts">
  import { PrescriptionInput, ParsedResults, PackageSelector } from '$lib/components';
  import {
    mockPrescriptionParse,
    mockPrescriptionParseWithCorrections,
    mockCalculationResult,
    mockCalculationResultLowConfidence
  } from '$lib/mock/mockData';
  import type { PrescriptionParse } from '$lib/types/prescription';
  import type { CalculationResult } from '$lib/types/medication';

  // UI State
  let currentStep = $state<'input' | 'results' | 'packages'>('input');
  let parsedResult = $state<PrescriptionParse | null>(null);
  let calculationResult = $state<CalculationResult | null>(null);
  let isProcessing = $state(false);

  // Mock API calls (replace with real API calls later)
  async function handlePrescriptionSubmit(event: { prescriptionText: string }) {
    const { prescriptionText } = event;
    console.log('Processing prescription:', prescriptionText);

    isProcessing = true;
    currentStep = 'input';

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Use mock data based on input
    if (prescriptionText.toLowerCase().includes('metformin') || prescriptionText.toLowerCase().includes('metfromin')) {
      parsedResult = mockPrescriptionParseWithCorrections;
    } else {
      parsedResult = mockPrescriptionParse;
    }

    isProcessing = false;
    currentStep = 'results';
  }

  async function handleFileUpload(event: { file: File }) {
    const { file } = event;
    console.log('Processing file:', file.name);

    isProcessing = true;

    // Simulate OCR processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Use mock data
    parsedResult = mockPrescriptionParse;
    isProcessing = false;
    currentStep = 'results';
  }

  async function handleFindPackages() {
    if (!parsedResult) return;

    isProcessing = true;

    // Simulate package search API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Use mock calculation result
    const lowConfidence = parsedResult.confidence < 0.85;
    calculationResult = lowConfidence ? mockCalculationResultLowConfidence : mockCalculationResult;

    isProcessing = false;
    currentStep = 'packages';
  }

  function handlePackageSelect(event: { ndc: string }) {
    const { ndc } = event;
    console.log('Package selected:', ndc);
    // In a real app, this would proceed to checkout/order
  }

  function handleStartOver() {
    currentStep = 'input';
    parsedResult = null;
    calculationResult = null;
    isProcessing = false;
  }
</script>

<svelte:head>
  <title>RxMatch - Prescription Package Matcher</title>
  <meta name="description" content="Parse prescriptions and find optimal NDC packages" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
  <!-- Header -->
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            RxMatch
          </h1>
          <p class="mt-1 text-sm text-gray-600">
            Prescription Package Matcher
          </p>
        </div>
        {#if currentStep !== 'input'}
          <button
            onclick={handleStartOver}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            ← Start Over
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Progress Steps -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <nav aria-label="Progress">
      <ol class="flex items-center justify-center gap-4 md:gap-8">
        <li class="flex items-center gap-2">
          <div class="flex items-center justify-center w-10 h-10 rounded-full {currentStep === 'input' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'}">
            {#if currentStep === 'input'}
              <span class="text-lg font-semibold">1</span>
            {:else}
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            {/if}
          </div>
          <span class="text-sm font-medium {currentStep === 'input' ? 'text-blue-600' : 'text-gray-900'}">
            Input Prescription
          </span>
        </li>

        <div class="hidden md:block w-16 h-1 {currentStep !== 'input' ? 'bg-green-500' : 'bg-gray-300'}"></div>

        <li class="flex items-center gap-2">
          <div class="flex items-center justify-center w-10 h-10 rounded-full {currentStep === 'results' ? 'bg-blue-600 text-white' : currentStep === 'packages' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}">
            {#if currentStep === 'results'}
              <span class="text-lg font-semibold">2</span>
            {:else if currentStep === 'packages'}
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            {:else}
              <span class="text-lg font-semibold">2</span>
            {/if}
          </div>
          <span class="text-sm font-medium {currentStep === 'results' ? 'text-blue-600' : currentStep === 'packages' ? 'text-gray-900' : 'text-gray-500'}">
            Review Results
          </span>
        </li>

        <div class="hidden md:block w-16 h-1 {currentStep === 'packages' ? 'bg-green-500' : 'bg-gray-300'}"></div>

        <li class="flex items-center gap-2">
          <div class="flex items-center justify-center w-10 h-10 rounded-full {currentStep === 'packages' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}">
            <span class="text-lg font-semibold">3</span>
          </div>
          <span class="text-sm font-medium {currentStep === 'packages' ? 'text-blue-600' : 'text-gray-500'}">
            Select Package
          </span>
        </li>
      </ol>
    </nav>
  </div>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
    <!-- Processing Overlay -->
    {#if isProcessing}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
          <svg class="animate-spin h-12 w-12 mx-auto text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Processing...</h3>
          <p class="text-gray-600 text-sm">
            {#if currentStep === 'input'}
              Parsing prescription with AI
            {:else if currentStep === 'results'}
              Searching for NDC packages
            {/if}
          </p>
        </div>
      </div>
    {/if}

    <!-- Step 1: Input -->
    {#if currentStep === 'input'}
      <PrescriptionInput
        onsubmit={handlePrescriptionSubmit}
        onfileUpload={handleFileUpload}
      />
    {/if}

    <!-- Step 2: Results -->
    {#if currentStep === 'results' && parsedResult}
      <div class="space-y-6">
        <ParsedResults result={parsedResult} />

        <div class="text-center">
          <button
            onclick={handleFindPackages}
            class="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-lg"
          >
            Find NDC Packages
            <svg class="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    {/if}

    <!-- Step 3: Packages -->
    {#if currentStep === 'packages' && calculationResult}
      <div class="space-y-6">
        <!-- Show parsed results in condensed form -->
        {#if parsedResult}
          <div class="bg-white rounded-lg shadow p-4 border border-gray-200">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Prescription Summary</h3>
            <p class="text-gray-900">
              <strong>{parsedResult.drugName}</strong> {parsedResult.strength} {parsedResult.form}
              - {parsedResult.quantity} units
            </p>
          </div>
        {/if}

        <PackageSelector
          packages={calculationResult.ndcPackages}
          recommendations={calculationResult.recommendations}
          warnings={calculationResult.warnings}
          prescriptionParse={parsedResult ?? undefined}
          calculationResult={calculationResult}
          onselect={handlePackageSelect}
        />
      </div>
    {/if}
  </main>

  <!-- Footer -->
  <footer class="bg-white border-t border-gray-200 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <p class="text-center text-sm text-gray-500">
        RxMatch - Prescription Package Matcher
        <span class="mx-2">|</span>
        <button type="button" class="text-blue-600 hover:text-blue-800">Privacy Policy</button>
        <span class="mx-2">|</span>
        <button type="button" class="text-blue-600 hover:text-blue-800">Terms of Service</button>
      </p>
    </div>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
</style>
