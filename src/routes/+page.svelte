<script lang="ts">
  import { PrescriptionInput, ParsedResults, PackageSelector } from '$lib/components';
  import { Button, Card } from '$lib/components/ui';
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

<div class="min-h-screen">
  <!-- Header -->
  <header class="bg-surface-50-900 border-b border-surface-200-700 shadow-lg animate-fade-in">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="h1 gradient-heading !text-4xl">
            RxMatch
          </h1>
          <p class="mt-2 text-sm text-surface-600-300 font-medium">
            AI-Powered NDC Packaging & Quantity Calculator
          </p>
        </div>
        {#if currentStep !== 'input'}
          <Button variant="ghost" onclick={handleStartOver}>
            ← Start Over
          </Button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Progress Steps -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
    <nav aria-label="Progress" class="variant-soft-surface p-6 rounded-container-token">
      <ol class="flex items-center justify-center gap-4 md:gap-8">
        <li class="flex items-center gap-3 animate-slide-in">
          <div class="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 {currentStep === 'input' ? 'variant-filled-primary scale-110' : 'variant-filled-success'}">
            {#if currentStep === 'input'}
              <span class="text-xl font-bold">1</span>
            {:else}
              <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            {/if}
          </div>
          <span class="text-base font-semibold {currentStep === 'input' ? 'text-primary-500' : 'text-surface-600-300'}">
            Input Prescription
          </span>
        </li>

        <div class="hidden md:block w-20 h-2 rounded-full transition-all duration-500 {currentStep !== 'input' ? 'bg-success-500' : 'bg-surface-300-600'}"></div>

        <li class="flex items-center gap-3 animate-slide-in [animation-delay:100ms]">
          <div class="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 {currentStep === 'results' ? 'variant-filled-primary scale-110' : currentStep === 'packages' ? 'variant-filled-success' : 'variant-soft-surface'}">
            {#if currentStep === 'results'}
              <span class="text-xl font-bold">2</span>
            {:else if currentStep === 'packages'}
              <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            {:else}
              <span class="text-xl font-bold">2</span>
            {/if}
          </div>
          <span class="text-base font-semibold {currentStep === 'results' ? 'text-primary-500' : currentStep === 'packages' ? 'text-surface-600-300' : 'text-surface-400-500'}">
            Review Results
          </span>
        </li>

        <div class="hidden md:block w-20 h-2 rounded-full transition-all duration-500 {currentStep === 'packages' ? 'bg-success-500' : 'bg-surface-300-600'}"></div>

        <li class="flex items-center gap-3 animate-slide-in [animation-delay:200ms]">
          <div class="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 {currentStep === 'packages' ? 'variant-filled-primary scale-110' : 'variant-soft-surface'}">
            <span class="text-xl font-bold">3</span>
          </div>
          <span class="text-base font-semibold {currentStep === 'packages' ? 'text-primary-500' : 'text-surface-400-500'}">
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
      <div class="modal-backdrop fixed inset-0 flex items-center justify-center z-50">
        <Card variant="elevated" padding="lg" class="max-w-sm w-full mx-4 text-center animate-fade-in shadow-2xl">
          <div class="flex flex-col items-center gap-4">
            <div class="relative">
              <svg class="animate-spin h-16 w-16 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div class="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 opacity-20 blur-xl animate-pulse"></div>
            </div>
            <div class="space-y-2">
              <h3 class="h3 font-bold">Processing...</h3>
              <p class="text-surface-600-300">
                {#if currentStep === 'input'}
                  Parsing prescription with AI
                {:else if currentStep === 'results'}
                  Searching for NDC packages
                {/if}
              </p>
            </div>
          </div>
        </Card>
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
      <div class="space-y-6 animate-fade-in">
        <ParsedResults result={parsedResult} />

        <div class="text-center">
          <Button variant="primary" size="lg" onclick={handleFindPackages} class="px-8 shadow-xl">
            Find NDC Packages
            <svg class="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Button>
        </div>
      </div>
    {/if}

    <!-- Step 3: Packages -->
    {#if currentStep === 'packages' && calculationResult}
      <div class="space-y-6 animate-fade-in">
        <!-- Show parsed results in condensed form -->
        {#if parsedResult}
          <Card variant="outlined" padding="md" class="border-primary-500/30 bg-primary-50/10">
            <h3 class="h4 mb-3 flex items-center gap-2">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Prescription Summary
            </h3>
            <p class="text-lg">
              <strong class="font-bold text-primary-500">{parsedResult.drugName}</strong>
              <span class="text-surface-600-300">{parsedResult.strength} {parsedResult.form} - {parsedResult.quantity} units</span>
            </p>
          </Card>
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
  <footer class="bg-surface-100-800 border-t border-surface-200-700 mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <p class="text-center text-sm text-surface-600-300 font-medium">
        RxMatch - AI-Powered NDC Packaging & Quantity Calculator
        <span class="mx-3">•</span>
        <button type="button" class="anchor transition-colors duration-250">Privacy Policy</button>
        <span class="mx-3">•</span>
        <button type="button" class="anchor transition-colors duration-250">Terms of Service</button>
      </p>
    </div>
  </footer>
</div>
