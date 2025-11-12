/**
 * RxNorm API service for drug standardization
 * NIH/NLM RxNorm API - Free public API (no authentication required)
 * API Documentation: https://lhncbc.nlm.nih.gov/RxNav/APIs/
 */

import type { RxNormResult } from '$lib/types';
import { getConfig } from '$lib/utils/config';
import { getCacheService, type CacheService } from './cache';
import { getAuditService, type AuditService } from './audit';

interface RxNormApproximateTermResponse {
	approximateGroup: {
		inputTerm: string;
		comment?: string;
		candidate?: RxNormCandidate | RxNormCandidate[];
	};
}

interface RxNormCandidate {
	rxcui: string;
	rxaui: string;
	score: string;
	rank: string;
	source?: string;
}

interface RxNormPropertiesResponse {
	propConceptGroup?: {
		propConcept?: Array<{
			propName: string;
			propValue: string;
		}>;
	};
}

interface RxNormNDCResponse {
	ndcGroup?: {
		ndcList?: {
			ndc?: string[];
		};
	};
}

export class RxNormService {
	private baseUrl: string;
	private cache: CacheService;
	private audit: AuditService;

	constructor() {
		this.baseUrl = getConfig().apis.rxnorm.baseUrl;
		this.cache = getCacheService();
		this.audit = getAuditService();
	}

	/**
	 * Find RxCUI using approximate term matching
	 * Filters results to prescribable drugs only
	 * Results are cached for 30 days
	 */
	async findRxCUI(drugName: string, strength?: string, form?: string, userId?: string): Promise<RxNormResult[]> {
		const startTime = Date.now();

		// Build search term combining drugName + strength + form
		let searchTerm = drugName.trim();
		if (strength) searchTerm += ` ${strength}`;
		if (form) searchTerm += ` ${form}`;

		// Build prescription text for audit logging
		const prescriptionText = `Drug: ${drugName}${strength ? `, Strength: ${strength}` : ''}${form ? `, Form: ${form}` : ''}`;

		// Check cache first (30-day TTL)
		const cachedRxCUI = await this.cache.getCachedRxCUI(drugName, strength, form);
		if (cachedRxCUI) {
			const processingTime = Date.now() - startTime;

			// Log cached RxNorm lookup
			await this.audit.logRxNormLookup(prescriptionText, cachedRxCUI, drugName, processingTime, { userId });

			// If cached, we know it's already validated as prescribable
			return [
				{
					rxcui: cachedRxCUI,
					name: searchTerm,
					tty: 'SCD' // Cached results are prescribable
				}
			];
		}

		try {
			// Call RxNorm API
			const candidates = await this.approximateTerm(searchTerm);
			if (!candidates || candidates.length === 0) {
				const processingTime = Date.now() - startTime;
				await this.audit.logRxNormLookup(prescriptionText, null, drugName, processingTime, { userId });
				return [];
			}

			// Filter to prescribable drugs and enrich with properties
			const results: RxNormResult[] = [];
			for (const candidate of candidates) {
				const properties = await this.getDrugPropertiesInternal(candidate.rxcui);

				// Check if prescribable based on term type
				if (properties?.tty && this.isPrescribableTermType(properties.tty)) {
					results.push({
						rxcui: candidate.rxcui,
						name: properties.name || searchTerm,
						tty: properties.tty
					});

					// Cache the first (best) prescribable match
					if (results.length === 1) {
						await this.cache.cacheRxCUI(drugName, candidate.rxcui, strength, form);
					}
				}
			}

			const processingTime = Date.now() - startTime;
			const firstRxcui = results.length > 0 ? results[0].rxcui : null;

			// Log RxNorm lookup result
			await this.audit.logRxNormLookup(prescriptionText, firstRxcui, drugName, processingTime, { userId });

			return results;
		} catch (error) {
			const processingTime = Date.now() - startTime;

			// Log API error
			if (error instanceof Error) {
				await this.audit.logAPIError('RxNorm', prescriptionText, error, { userId, processingTime });
			}

			throw error;
		}
	}

	/**
	 * Get NDC codes for a given RxCUI
	 */
	async getNDCsForRxCUI(rxcui: string): Promise<string[]> {
		const url = `${this.baseUrl}/rxcui/${rxcui}/ndcs.json`;

		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'RxMatch/1.0'
				}
			});

			if (!response.ok) {
				console.error(`RxNorm NDC lookup error: ${response.status} for RxCUI ${rxcui}`);
				return [];
			}

			const data: RxNormNDCResponse = await response.json();
			return data.ndcGroup?.ndcList?.ndc || [];
		} catch (error) {
			console.error('RxNorm NDC fetch error:', error);
			return [];
		}
	}

	/**
	 * Get drug properties for a given RxCUI
	 */
	async getDrugProperties(rxcui: string): Promise<{
		name: string;
		strength?: string;
		form?: string;
	}> {
		const properties = await this.getDrugPropertiesInternal(rxcui);
		return {
			name: properties?.name || '',
			strength: properties?.strength,
			form: properties?.form
		};
	}

	/**
	 * Call /approximateTerm endpoint to get candidate RxCUIs
	 * Returns candidates sorted by score (best match first)
	 */
	private async approximateTerm(term: string): Promise<RxNormCandidate[]> {
		const url = `${this.baseUrl}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=10`;

		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'RxMatch/1.0'
				}
			});

			if (!response.ok) {
				console.error(`RxNorm API error: ${response.status} ${response.statusText}`);
				return [];
			}

			const data: RxNormApproximateTermResponse = await response.json();

			// Handle single candidate or array of candidates
			const candidateData = data.approximateGroup?.candidate;
			if (!candidateData) {
				return [];
			}

			const candidates = Array.isArray(candidateData) ? candidateData : [candidateData];

			// Sort by score descending (best match first)
			return candidates.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
		} catch (error) {
			console.error('RxNorm API fetch error:', error);
			return [];
		}
	}

	/**
	 * Get detailed drug properties including term type (TTY)
	 */
	private async getDrugPropertiesInternal(
		rxcui: string
	): Promise<{ name: string; tty?: string; strength?: string; form?: string } | null> {
		const url = `${this.baseUrl}/rxcui/${rxcui}/properties.json`;

		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/json',
					'User-Agent': 'RxMatch/1.0'
				}
			});

			if (!response.ok) {
				console.error(`RxNorm properties error: ${response.status} for RxCUI ${rxcui}`);
				return null;
			}

			const data: any = await response.json();
			const properties = data.properties;

			if (!properties) {
				return null;
			}

			return {
				name: properties.name || '',
				tty: properties.tty,
				strength: properties.strength,
				form: properties.dosageForm
			};
		} catch (error) {
			console.error('RxNorm properties fetch error:', error);
			return null;
		}
	}

	/**
	 * Check if a term type represents a prescribable drug
	 *
	 * Prescribable term types:
	 * - SCD: Semantic Clinical Drug (generic + strength + form)
	 * - SBD: Semantic Branded Drug (brand + strength + form)
	 * - GPCK: Generic Pack
	 * - BPCK: Branded Pack
	 */
	private isPrescribableTermType(tty: string): boolean {
		const prescribableTypes = ['SCD', 'SBD', 'GPCK', 'BPCK'];
		return prescribableTypes.includes(tty);
	}
}

// Singleton instance
let rxNormService: RxNormService | null = null;

export function getRxNormService(): RxNormService {
	if (!rxNormService) {
		rxNormService = new RxNormService();
	}
	return rxNormService;
}
