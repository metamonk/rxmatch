/**
 * SvelteKit Server Hooks
 *
 * Security Configuration:
 * - Implements HTTPS/TLS enforcement
 * - Sets secure HTTP headers (HSTS, CSP, etc.)
 * - Configures CORS for production
 * - Implements security best practices for healthcare data
 */

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Get the response from SvelteKit
	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			// Allow all headers through for security headers to work
			return true;
		}
	});

	// Only apply security headers in non-development environments
	const isDev = process.env.NODE_ENV === 'development';

	// ============================================
	// SECURITY HEADERS FOR HIPAA COMPLIANCE
	// ============================================

	// 1. HTTP Strict Transport Security (HSTS)
	// Forces HTTPS for 1 year, including subdomains
	if (!isDev) {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains; preload'
		);
	}

	// 2. Content Security Policy (CSP)
	// Restricts resource loading to prevent XSS attacks
	const cspDirectives = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: 'unsafe-inline' needed for SvelteKit, consider using nonce in production
		"style-src 'self' 'unsafe-inline'", // Note: 'unsafe-inline' needed for Tailwind
		"img-src 'self' data: https:",
		"font-src 'self' data:",
		"connect-src 'self' https://api.openai.com https://rxnav.nlm.nih.gov https://api.fda.gov",
		"frame-ancestors 'none'", // Equivalent to X-Frame-Options: DENY
		"base-uri 'self'",
		"form-action 'self'",
		"upgrade-insecure-requests"
	];
	response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

	// 3. X-Frame-Options
	// Prevents clickjacking attacks
	response.headers.set('X-Frame-Options', 'DENY');

	// 4. X-Content-Type-Options
	// Prevents MIME type sniffing
	response.headers.set('X-Content-Type-Options', 'nosniff');

	// 5. Referrer-Policy
	// Controls referrer information sent to other sites
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// 6. Permissions-Policy (formerly Feature-Policy)
	// Restricts browser features and APIs
	const permissionsPolicy = [
		'accelerometer=()',
		'camera=()',
		'geolocation=()',
		'gyroscope=()',
		'magnetometer=()',
		'microphone=()',
		'payment=()',
		'usb=()'
	];
	response.headers.set('Permissions-Policy', permissionsPolicy.join(', '));

	// 7. X-XSS-Protection (Legacy, but still useful for older browsers)
	response.headers.set('X-XSS-Protection', '1; mode=block');

	// 8. Cache-Control for sensitive data
	// Prevents caching of sensitive healthcare information
	if (event.url.pathname.startsWith('/api')) {
		response.headers.set(
			'Cache-Control',
			'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
		);
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}

	// 9. Remove server identification headers
	response.headers.delete('X-Powered-By');
	response.headers.delete('Server');

	// 10. CORS Configuration (Production only)
	if (!isDev) {
		// Only allow requests from your domain
		const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
		const origin = event.request.headers.get('origin');

		if (origin && allowedOrigins.includes(origin)) {
			response.headers.set('Access-Control-Allow-Origin', origin);
			response.headers.set('Access-Control-Allow-Credentials', 'true');
		}

		// Handle preflight requests
		if (event.request.method === 'OPTIONS') {
			response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
			response.headers.set(
				'Access-Control-Allow-Headers',
				'Content-Type, Authorization, X-Requested-With'
			);
			response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
		}
	}

	return response;
};
