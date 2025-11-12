/**
 * FDA-related utility functions for client and server use
 */

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
