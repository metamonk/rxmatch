/**
 * FDA NDC Directory API service
 * openFDA Drug NDC Directory API - Free public API (no authentication required)
 * API Documentation: https://open.fda.gov/apis/drug/ndc/
 */

import type { NDCPackage } from '$lib/types';
import { getConfig } from '$lib/utils/config';
import { getCacheService, type CacheService } from './cache';
import { getAuditService, type AuditService } from './audit';

interface FDANDCResult {
	product_ndc: string;
	generic_name: string;
	labeler_name: string;
	brand_name?: string;
	brand_name_base?: string;
	dosage_form: string;
	route: string[];
	active_ingredients?: Array<{
		name: string;
		strength: string;
	}>;
	packaging?: Array<{
		package_ndc: string;
		description: string;
		marketing_start_date?: string;
		sample?: boolean;
	}>;
	listing_expiration_date?: string;
	marketing_category?: string;
	finished?: boolean;
	product_type?: string;
}

/**
 * Helper to format expiration date from YYYYMMDD to readable format
 */
export function formatExpirationDate(expirationDate?: string): string | null {
	if (!expirationDate) return null;

	const year = expirationDate.substring(0, 4);
	const month = expirationDate.substring(4, 6);
	const day = expirationDate.substring(6, 8);

	const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
	return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface FDAResponse {
	meta: {
		results: {
			skip: number;
			limit: number;
			total: number;
		};
	};
	results: FDANDCResult[];
}

const FDA_CACHE_TTL = 43200; // 12 hours in seconds

export class FDAService {
	private baseUrl: string;
	private cache: CacheService;
	private audit: AuditService;

	constructor() {
		this.baseUrl = getConfig().apis.fda.baseUrl;
		this.cache = getCacheService();
		this.audit = getAuditService();
	}

	/**
	 * Search for NDC packages by NDC code
	 * Results are cached for 12 hours
	 */
	async searchByNDC(ndc: string, userId?: string): Promise<NDCPackage[]> {
		const startTime = Date.now();
		const prescriptionText = `NDC Search: ${ndc}`;

		// Normalize NDC (remove dashes)
		const normalizedNDC = ndc.replace(/-/g, '');

		// Check cache first
		const cacheKey = `fda:ndc:${normalizedNDC}`;
		const cached = await this.cache.get<NDCPackage[]>(cacheKey);
		if (cached) {
			const processingTime = Date.now() - startTime;
			const ndcCodes = cached.map(pkg => pkg.ndc);
			await this.audit.logFDANDCSearch(prescriptionText, null, ndcCodes, processingTime, { userId });
			return cached;
		}

		// Search FDA API by package NDC
		const url = `${this.baseUrl}?search=packaging.package_ndc:"${normalizedNDC}"&limit=100`;

		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'RxMatch/1.0'
				}
			});

			if (!response.ok) {
				console.error(`FDA API error: ${response.status} ${response.statusText}`);
				const processingTime = Date.now() - startTime;
				const error = new Error(`FDA API error: ${response.status} ${response.statusText}`);
				await this.audit.logAPIError('FDA', prescriptionText, error, { userId, processingTime });
				return [];
			}

			const data: FDAResponse = await response.json();
			const packages = this.parseResults(data.results);

			// Cache the results (12-hour TTL)
			await this.cache.set(cacheKey, packages, FDA_CACHE_TTL);

			const processingTime = Date.now() - startTime;
			const ndcCodes = packages.map(pkg => pkg.ndc);
			await this.audit.logFDANDCSearch(prescriptionText, null, ndcCodes, processingTime, { userId });

			return packages;
		} catch (error) {
			const processingTime = Date.now() - startTime;
			if (error instanceof Error) {
				await this.audit.logAPIError('FDA', prescriptionText, error, { userId, processingTime });
			}
			console.error('FDA API fetch error:', error);
			return [];
		}
	}

	/**
	 * Search for NDC packages by drug name
	 * Can search by generic name or brand name
	 * Results are cached for 12 hours
	 */
	async searchByDrugName(drugName: string, limit = 100, userId?: string): Promise<NDCPackage[]> {
		const startTime = Date.now();
		const prescriptionText = `Drug Name Search: ${drugName}`;

		// Check cache first
		const cacheKey = `fda:drug:${drugName.toLowerCase()}`;
		const cached = await this.cache.get<NDCPackage[]>(cacheKey);
		if (cached) {
			const processingTime = Date.now() - startTime;
			const ndcCodes = cached.map(pkg => pkg.ndc);
			await this.audit.logFDANDCSearch(prescriptionText, null, ndcCodes, processingTime, { userId });
			return cached;
		}

		// Search by generic name with fallback to brand name
		const searchQuery = `generic_name:"${drugName}" OR brand_name:"${drugName}"`;
		const url = `${this.baseUrl}?search=${encodeURIComponent(searchQuery)}&limit=${limit}`;

		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'RxMatch/1.0'
				}
			});

			if (!response.ok) {
				console.error(`FDA API error: ${response.status} ${response.statusText}`);
				const processingTime = Date.now() - startTime;
				const error = new Error(`FDA API error: ${response.status} ${response.statusText}`);
				await this.audit.logAPIError('FDA', prescriptionText, error, { userId, processingTime });
				return [];
			}

			const data: FDAResponse = await response.json();
			const packages = this.parseResults(data.results);

			// Cache the results (12-hour TTL)
			await this.cache.set(cacheKey, packages, FDA_CACHE_TTL);

			const processingTime = Date.now() - startTime;
			const ndcCodes = packages.map(pkg => pkg.ndc);
			await this.audit.logFDANDCSearch(prescriptionText, null, ndcCodes, processingTime, { userId });

			return packages;
		} catch (error) {
			const processingTime = Date.now() - startTime;
			if (error instanceof Error) {
				await this.audit.logAPIError('FDA', prescriptionText, error, { userId, processingTime });
			}
			console.error('FDA API fetch error:', error);
			return [];
		}
	}

	/**
	 * Search by RxCUI with fallback to drug name
	 * This is the preferred search method when RxCUI is available
	 */
	async searchByRxCUI(rxcui: string, drugNameFallback?: string, userId?: string): Promise<NDCPackage[]> {
		const startTime = Date.now();
		const prescriptionText = `RxCUI Search: ${rxcui}${drugNameFallback ? ` (${drugNameFallback})` : ''}`;

		// Check cache first
		const cacheKey = `fda:rxcui:${rxcui}`;
		const cached = await this.cache.get<NDCPackage[]>(cacheKey);
		if (cached) {
			const processingTime = Date.now() - startTime;
			const ndcCodes = cached.map(pkg => pkg.ndc);
			await this.audit.logFDANDCSearch(prescriptionText, rxcui, ndcCodes, processingTime, { userId });
			return cached;
		}

		// Search by RxCUI in openfda.rxcui field
		const url = `${this.baseUrl}?search=openfda.rxcui:"${rxcui}"&limit=100`;

		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'RxMatch/1.0'
				}
			});

			if (!response.ok) {
				console.error(`FDA API error: ${response.status} ${response.statusText}`);
				const processingTime = Date.now() - startTime;
				const error = new Error(`FDA API error: ${response.status} ${response.statusText}`);
				await this.audit.logAPIError('FDA', prescriptionText, error, { userId, processingTime });

				// Fallback to drug name search if RxCUI search fails
				if (drugNameFallback) {
					return this.searchByDrugName(drugNameFallback, 100, userId);
				}
				return [];
			}

			const data: FDAResponse = await response.json();
			const packages = this.parseResults(data.results);

			// Cache the results (12-hour TTL)
			await this.cache.set(cacheKey, packages, FDA_CACHE_TTL);

			const processingTime = Date.now() - startTime;
			const ndcCodes = packages.map(pkg => pkg.ndc);
			await this.audit.logFDANDCSearch(prescriptionText, rxcui, ndcCodes, processingTime, { userId });

			return packages;
		} catch (error) {
			const processingTime = Date.now() - startTime;
			if (error instanceof Error) {
				await this.audit.logAPIError('FDA', prescriptionText, error, { userId, processingTime });
			}
			console.error('FDA API fetch error:', error);

			// Fallback to drug name search
			if (drugNameFallback) {
				return this.searchByDrugName(drugNameFallback, 100, userId);
			}
			return [];
		}
	}

	/**
	 * Get detailed package information for a specific NDC
	 */
	async getPackageDetails(ndc: string): Promise<NDCPackage | null> {
		const packages = await this.searchByNDC(ndc);
		return packages.length > 0 ? packages[0] : null;
	}

	/**
	 * Parse FDA API results into NDCPackage format
	 * Extracts package information and determines active/inactive status
	 */
	private parseResults(results: FDANDCResult[]): NDCPackage[] {
		const packages: NDCPackage[] = [];

		for (const result of results) {
			if (!result.packaging || result.packaging.length === 0) {
				continue;
			}

			// Determine if the product is active based on listing_expiration_date
			const isActive = this.isProductActive(result.listing_expiration_date);

			// Calculate strength string from active ingredients
			const strengthStr = this.formatStrength(result.active_ingredients);

			// Process each package
			for (const pkg of result.packaging) {
				// Skip sample packages
				if (pkg.sample) continue;

				packages.push({
					ndc: pkg.package_ndc,
					productNdc: result.product_ndc,
					genericName: result.generic_name,
					labelerName: result.labeler_name,
					brandName: result.brand_name || result.brand_name_base,
					dosageForm: result.dosage_form,
					route: result.route || [],
					strength: strengthStr,
					packageDescription: pkg.description,
					packageQuantity: this.extractQuantityFromDescription(pkg.description),
					packageUnit: this.extractUnitFromDescription(pkg.description),
					isActive,
					expirationDate: result.listing_expiration_date
				});
			}
		}

		return packages;
	}

	/**
	 * Check if a product is active based on listing_expiration_date
	 * If no expiration date, assume active
	 */
	private isProductActive(expirationDate?: string): boolean {
		if (!expirationDate) {
			return true; // No expiration date means actively marketed
		}

		// Parse YYYYMMDD format
		const year = parseInt(expirationDate.substring(0, 4));
		const month = parseInt(expirationDate.substring(4, 6)) - 1; // JS months are 0-indexed
		const day = parseInt(expirationDate.substring(6, 8));

		const expiration = new Date(year, month, day);
		const now = new Date();

		return expiration > now;
	}

	/**
	 * Format strength from active ingredients
	 */
	private formatStrength(ingredients?: Array<{ name: string; strength: string }>): string {
		if (!ingredients || ingredients.length === 0) {
			return '';
		}

		if (ingredients.length === 1) {
			return ingredients[0].strength;
		}

		// Multiple ingredients - format as "ingredient1 strength1 / ingredient2 strength2"
		return ingredients.map((ing) => `${ing.name} ${ing.strength}`).join(' / ');
	}

	/**
	 * Extract package quantity from description
	 * Example: "90 TABLET in 1 BOTTLE" -> 90
	 */
	private extractQuantityFromDescription(description: string): number {
		const match = description.match(/^(\d+)\s+/);
		return match ? parseInt(match[1]) : 1;
	}

	/**
	 * Extract package unit from description
	 * Example: "90 TABLET in 1 BOTTLE" -> "TABLET"
	 */
	private extractUnitFromDescription(description: string): string {
		const match = description.match(/^\d+\s+(\w+)/);
		return match ? match[1] : 'UNIT';
	}
}

// Singleton instance
let fdaService: FDAService | null = null;

export function getFDAService(): FDAService {
	if (!fdaService) {
		fdaService = new FDAService();
	}
	return fdaService;
}
