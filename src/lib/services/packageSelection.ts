/**
 * Package Selection Algorithm Service
 * Task 6: Package Selection Algorithm Development
 *
 * Implements a greedy algorithm to select optimal NDC packages with minimal overfill.
 * Supports single-package and multi-package combinations (up to 3 packages).
 */

import type { NDCPackage } from '$lib/types/medication';

/**
 * Package selection result with detailed recommendation
 */
export interface PackageSelection {
  selectedPackages: SelectedPackage[];
  totalUnits: number;
  overfill: number;
  overfillPercentage: number;
  efficiency: number;
  score: number;
  reasoning: string;
  costEfficiency: 'optimal' | 'acceptable' | 'wasteful';
}

/**
 * Individual selected package with quantity
 */
export interface SelectedPackage {
  package: NDCPackage;
  quantity: number; // Number of this package to dispense
  units: number; // Total units from this package (packageQuantity * quantity)
}

/**
 * Options for package selection algorithm
 */
export interface PackageSelectionOptions {
  maxPackages?: number; // Maximum number of different packages to combine (default: 3)
  preferFewerPackages?: boolean; // Prefer solutions with fewer packages (default: true)
  allowOverfill?: boolean; // Allow overfill solutions (default: true)
  maxOverfillPercentage?: number; // Maximum acceptable overfill percentage (default: 50)
}

/**
 * Default options for package selection
 */
const DEFAULT_OPTIONS: Required<PackageSelectionOptions> = {
  maxPackages: 3,
  preferFewerPackages: true,
  allowOverfill: true,
  maxOverfillPercentage: 50
};

/**
 * Scoring weights for package selection
 */
const SCORING_WEIGHTS = {
  overfill: 0.6, // 60% - minimize waste
  packageCount: 0.3, // 30% - fewer packages better
  sizePreference: 0.1 // 10% - prefer standard sizes
};

/**
 * Efficiency thresholds for cost efficiency classification
 */
const EFFICIENCY_THRESHOLDS = {
  optimal: 95, // ≥95% efficiency
  acceptable: 80 // ≥80% efficiency
};

export class PackageSelectionService {
  /**
   * Select optimal NDC packages for a given quantity
   * @param quantity - Required quantity (e.g., 90 tablets)
   * @param availablePackages - List of available NDC packages
   * @param options - Algorithm options
   * @returns Best package selection with reasoning
   */
  selectOptimalPackages(
    quantity: number,
    availablePackages: NDCPackage[],
    options?: PackageSelectionOptions
  ): PackageSelection {
    // Validate inputs
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    if (!availablePackages || availablePackages.length === 0) {
      throw new Error('No packages available for selection');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Filter packages by unit compatibility and active status
    const compatiblePackages = this.filterCompatiblePackages(availablePackages, quantity);
    if (compatiblePackages.length === 0) {
      throw new Error('No compatible packages found for the requested quantity');
    }

    // Sort packages by size (ascending) for greedy algorithm
    const sortedPackages = this.sortPackagesBySize(compatiblePackages);

    // Try single package solution first
    const singlePackageSolution = this.findSinglePackageSolution(quantity, sortedPackages);

    // Try multi-package combinations if allowed
    let multiPackageSolution: PackageSelection | null = null;
    if (opts.maxPackages > 1) {
      multiPackageSolution = this.findMultiPackSolution(quantity, sortedPackages, opts);
    }

    // Choose best solution
    const bestSolution = this.chooseBestSolution(
      singlePackageSolution,
      multiPackageSolution,
      opts
    );

    // Add reasoning
    return this.addReasoning(bestSolution, quantity);
  }

  /**
   * Filter packages by unit compatibility
   * Only keep packages with the same unit type as the first package
   */
  private filterCompatiblePackages(packages: NDCPackage[], quantity: number): NDCPackage[] {
    // Filter out inactive packages and packages with invalid quantities
    let filtered = packages.filter(
      pkg => pkg.isActive && pkg.packageQuantity > 0 && pkg.packageUnit
    );

    if (filtered.length === 0) {
      // If no active packages, allow inactive but warn
      filtered = packages.filter(pkg => pkg.packageQuantity > 0 && pkg.packageUnit);
    }

    // Group by unit type and select the most common unit
    const unitCounts = new Map<string, number>();
    filtered.forEach(pkg => {
      const unit = this.normalizeUnit(pkg.packageUnit);
      unitCounts.set(unit, (unitCounts.get(unit) || 0) + 1);
    });

    // Find most common unit
    let mostCommonUnit = '';
    let maxCount = 0;
    unitCounts.forEach((count, unit) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonUnit = unit;
      }
    });

    // Filter to only packages with the most common unit
    return filtered.filter(pkg => {
      const unit = this.normalizeUnit(pkg.packageUnit);
      return unit === mostCommonUnit;
    });
  }

  /**
   * Normalize unit names for comparison
   */
  private normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();

    // Handle common variations
    const unitMap: Record<string, string> = {
      'tablet': 'tablet',
      'tablets': 'tablet',
      'capsule': 'capsule',
      'capsules': 'capsule',
      'ml': 'ml',
      'milliliter': 'ml',
      'milliliters': 'ml',
      'l': 'l',
      'liter': 'l',
      'liters': 'l',
      'gram': 'g',
      'grams': 'g',
      'g': 'g'
    };

    return unitMap[normalized] || normalized;
  }

  /**
   * Sort packages by size (ascending)
   */
  private sortPackagesBySize(packages: NDCPackage[]): NDCPackage[] {
    return [...packages].sort((a, b) => a.packageQuantity - b.packageQuantity);
  }

  /**
   * Find best single package solution
   */
  private findSinglePackageSolution(quantity: number, sortedPackages: NDCPackage[]): PackageSelection {
    // First, look for exact match
    const exactMatch = sortedPackages.find(pkg => pkg.packageQuantity === quantity);
    if (exactMatch) {
      return this.createSelection(
        [{
          package: exactMatch,
          quantity: 1,
          units: exactMatch.packageQuantity
        }],
        quantity
      );
    }

    // Look for smallest package >= quantity
    const largeEnough = sortedPackages.find(pkg => pkg.packageQuantity >= quantity);
    if (largeEnough) {
      return this.createSelection(
        [{
          package: largeEnough,
          quantity: 1,
          units: largeEnough.packageQuantity
        }],
        quantity
      );
    }

    // No single package large enough - use largest package multiple times
    const largestPackage = sortedPackages[sortedPackages.length - 1];
    const packagesNeeded = Math.ceil(quantity / largestPackage.packageQuantity);

    return this.createSelection(
      [{
        package: largestPackage,
        quantity: packagesNeeded,
        units: largestPackage.packageQuantity * packagesNeeded
      }],
      quantity
    );
  }

  /**
   * Find best multi-package combination
   */
  private findMultiPackSolution(
    quantity: number,
    sortedPackages: NDCPackage[],
    options: Required<PackageSelectionOptions>
  ): PackageSelection | null {
    const bestSolutions: PackageSelection[] = [];

    // Limit package search to top N most relevant packages for performance
    const maxPackagesToConsider = Math.min(sortedPackages.length, 15);
    const relevantPackages = sortedPackages.slice(0, maxPackagesToConsider);

    // Try 2-package combinations
    for (let i = 0; i < relevantPackages.length; i++) {
      for (let j = i; j < relevantPackages.length; j++) {
        const solutions = this.tryPackageCombination(
          quantity,
          [relevantPackages[i], relevantPackages[j]],
          options
        );
        bestSolutions.push(...solutions);
      }
    }

    // Try 3-package combinations if allowed
    if (options.maxPackages >= 3) {
      for (let i = 0; i < relevantPackages.length; i++) {
        for (let j = i; j < relevantPackages.length; j++) {
          for (let k = j; k < relevantPackages.length; k++) {
            const solutions = this.tryPackageCombination(
              quantity,
              [relevantPackages[i], relevantPackages[j], relevantPackages[k]],
              options
            );
            bestSolutions.push(...solutions);
          }
        }
      }
    }

    // Return best scoring solution
    if (bestSolutions.length === 0) return null;

    return bestSolutions.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }

  /**
   * Try different quantity combinations for given packages
   */
  private tryPackageCombination(
    targetQuantity: number,
    packages: NDCPackage[],
    options: Required<PackageSelectionOptions>
  ): PackageSelection[] {
    const solutions: PackageSelection[] = [];
    const maxPerPackage = 10; // Max of each package type to try

    // Generate combinations
    const combinations = this.generateCombinations(packages.length, maxPerPackage);

    for (const combo of combinations) {
      const selectedPackages: SelectedPackage[] = [];
      let totalUnits = 0;

      for (let i = 0; i < packages.length; i++) {
        if (combo[i] > 0) {
          selectedPackages.push({
            package: packages[i],
            quantity: combo[i],
            units: packages[i].packageQuantity * combo[i]
          });
          totalUnits += packages[i].packageQuantity * combo[i];
        }
      }

      // Check if this combination is valid
      if (totalUnits >= targetQuantity) {
        const overfill = totalUnits - targetQuantity;
        const overfillPercentage = (overfill / targetQuantity) * 100;

        // Skip if overfill is too high
        if (options.allowOverfill && overfillPercentage <= options.maxOverfillPercentage) {
          solutions.push(this.createSelection(selectedPackages, targetQuantity));
        } else if (!options.allowOverfill && overfill === 0) {
          solutions.push(this.createSelection(selectedPackages, targetQuantity));
        }
      }
    }

    return solutions;
  }

  /**
   * Generate quantity combinations for packages
   */
  private generateCombinations(numPackages: number, maxPerPackage: number): number[][] {
    const combinations: number[][] = [];

    // Use a simple iterative approach for up to 3 packages
    if (numPackages === 2) {
      for (let i = 0; i <= maxPerPackage; i++) {
        for (let j = 0; j <= maxPerPackage; j++) {
          if (i + j > 0) { // At least one package
            combinations.push([i, j]);
          }
        }
      }
    } else if (numPackages === 3) {
      for (let i = 0; i <= maxPerPackage; i++) {
        for (let j = 0; j <= maxPerPackage; j++) {
          for (let k = 0; k <= maxPerPackage; k++) {
            if (i + j + k > 0) { // At least one package
              combinations.push([i, j, k]);
            }
          }
        }
      }
    } else {
      // Single package - just return quantities 1 to maxPerPackage
      for (let i = 1; i <= maxPerPackage; i++) {
        combinations.push([i]);
      }
    }

    return combinations;
  }

  /**
   * Create a PackageSelection from selected packages
   */
  private createSelection(selectedPackages: SelectedPackage[], targetQuantity: number): PackageSelection {
    const totalUnits = selectedPackages.reduce((sum, sp) => sum + sp.units, 0);
    const overfill = totalUnits - targetQuantity;
    const overfillPercentage = (overfill / targetQuantity) * 100;
    const efficiency = (targetQuantity / totalUnits) * 100;
    const score = this.calculateScore(selectedPackages, overfillPercentage, efficiency);
    const costEfficiency = this.classifyEfficiency(efficiency);

    return {
      selectedPackages,
      totalUnits,
      overfill,
      overfillPercentage,
      efficiency,
      score,
      reasoning: '',
      costEfficiency
    };
  }

  /**
   * Calculate score for a package selection
   * Higher score is better
   */
  private calculateScore(
    selectedPackages: SelectedPackage[],
    overfillPercentage: number,
    efficiency: number
  ): number {
    // Overfill score (0-100): lower overfill = higher score
    const overfillScore = Math.max(0, 100 - overfillPercentage);

    // Package count score (0-100): fewer packages = higher score
    const totalPackageCount = selectedPackages.reduce((sum, sp) => sum + sp.quantity, 0);
    const packageCountScore = Math.max(0, 100 - (totalPackageCount - 1) * 20);

    // Size preference score: prefer standard package sizes
    const sizeScore = this.calculateSizePreferenceScore(selectedPackages);

    // Weighted total
    return (
      overfillScore * SCORING_WEIGHTS.overfill +
      packageCountScore * SCORING_WEIGHTS.packageCount +
      sizeScore * SCORING_WEIGHTS.sizePreference
    );
  }

  /**
   * Calculate size preference score
   * Prefer standard pharmacy package sizes
   */
  private calculateSizePreferenceScore(selectedPackages: SelectedPackage[]): number {
    const standardSizes = [30, 60, 90, 100, 120, 500, 1000];

    let score = 50; // Base score

    for (const sp of selectedPackages) {
      if (standardSizes.includes(sp.package.packageQuantity)) {
        score += 20 / selectedPackages.length;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Calculate efficiency percentage
   */
  calculateEfficiency(targetQuantity: number, totalUnits: number): number {
    if (totalUnits === 0) return 0;
    return (targetQuantity / totalUnits) * 100;
  }

  /**
   * Calculate overfill amount and percentage
   */
  calculateOverfill(targetQuantity: number, totalUnits: number): { amount: number; percentage: number } {
    const amount = totalUnits - targetQuantity;
    const percentage = (amount / targetQuantity) * 100;
    return { amount, percentage };
  }

  /**
   * Classify efficiency as optimal, acceptable, or wasteful
   */
  private classifyEfficiency(efficiency: number): 'optimal' | 'acceptable' | 'wasteful' {
    if (efficiency >= EFFICIENCY_THRESHOLDS.optimal) return 'optimal';
    if (efficiency >= EFFICIENCY_THRESHOLDS.acceptable) return 'acceptable';
    return 'wasteful';
  }

  /**
   * Choose best solution between single and multi-package options
   */
  private chooseBestSolution(
    singlePackage: PackageSelection,
    multiPackage: PackageSelection | null,
    options: Required<PackageSelectionOptions>
  ): PackageSelection {
    if (!multiPackage) return singlePackage;

    // If preferring fewer packages, bias toward single package
    if (options.preferFewerPackages) {
      // Single package wins if scores are close (within 5 points)
      if (singlePackage.score >= multiPackage.score - 5) {
        return singlePackage;
      }
    }

    // Otherwise, return higher scoring solution
    return singlePackage.score >= multiPackage.score ? singlePackage : multiPackage;
  }

  /**
   * Add reasoning to package selection
   */
  private addReasoning(selection: PackageSelection, targetQuantity: number): PackageSelection {
    const reasons: string[] = [];

    // Describe selection
    if (selection.selectedPackages.length === 1 && selection.selectedPackages[0].quantity === 1) {
      reasons.push('Single package solution');
    } else if (selection.selectedPackages.length === 1) {
      reasons.push(`Using ${selection.selectedPackages[0].quantity} packages of the same size`);
    } else {
      reasons.push(`Multi-package combination (${selection.selectedPackages.length} different sizes)`);
    }

    // Describe efficiency
    if (selection.overfill === 0) {
      reasons.push('exact match with no waste');
    } else if (selection.overfillPercentage < 5) {
      reasons.push('minimal waste');
    } else if (selection.overfillPercentage < 15) {
      reasons.push('acceptable waste level');
    } else {
      reasons.push(`${selection.overfillPercentage.toFixed(1)}% overfill`);
    }

    // Add efficiency classification
    reasons.push(`${selection.efficiency.toFixed(1)}% efficient (${selection.costEfficiency})`);

    return {
      ...selection,
      reasoning: reasons.join(' - ')
    };
  }

  /**
   * Generate package recommendations from selection
   * Converts PackageSelection to format expected by UI
   */
  generateRecommendations(selection: PackageSelection, targetQuantity: number): Array<{
    ndc: string;
    packageDescription: string;
    quantityNeeded: number;
    packagesRequired: number;
    totalUnits: number;
    overage: number;
    costEfficiency: 'optimal' | 'acceptable' | 'wasteful';
    labelerName: string;
    brandName?: string;
  }> {
    return selection.selectedPackages.map(sp => ({
      ndc: sp.package.ndc,
      packageDescription: sp.package.packageDescription,
      quantityNeeded: targetQuantity,
      packagesRequired: sp.quantity,
      totalUnits: sp.units,
      overage: selection.overfill,
      costEfficiency: selection.costEfficiency,
      labelerName: sp.package.labelerName,
      brandName: sp.package.brandName
    }));
  }
}

/**
 * Singleton instance
 */
let packageSelectionService: PackageSelectionService | null = null;

export function getPackageSelectionService(): PackageSelectionService {
  if (!packageSelectionService) {
    packageSelectionService = new PackageSelectionService();
  }
  return packageSelectionService;
}
