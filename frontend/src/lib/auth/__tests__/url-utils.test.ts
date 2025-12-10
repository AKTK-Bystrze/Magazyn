import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isSafeRedirect, validateRedirectUrl } from '../url-utils';

describe('url-utils', () => {
  const origin = 'http://localhost:4321';
  
  // Mock console methods to keep test output clean
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('isSafeRedirect', () => {
    describe('Valid Internal URLs', () => {
      it('accepts valid public routes', () => {
        expect(isSafeRedirect('/login', origin)).toBe(true);
      });

      it('accepts valid protected routes', () => {
        expect(isSafeRedirect('/admin', origin)).toBe(true);
        expect(isSafeRedirect('/dashboard', origin)).toBe(true);
        expect(isSafeRedirect('/account-disabled', origin)).toBe(true);
      });

      it('accepts routes with query parameters', () => {
        expect(isSafeRedirect('/dashboard?tab=overview', origin)).toBe(true);
      });

      it('accepts routes with hash fragments', () => {
        expect(isSafeRedirect('/admin#settings', origin)).toBe(true);
      });
    });

    describe('External URL Protection (OWASP Security)', () => {
      it('rejects HTTPS external URLs', () => {
        expect(isSafeRedirect('https://evil.com', origin)).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('Blocked external redirect')
        );
      });

      it('rejects HTTP external URLs', () => {
        expect(isSafeRedirect('http://evil.com', origin)).toBe(false);
      });

      it('rejects external URLs with same path', () => {
        expect(isSafeRedirect('https://evil.com/admin', origin)).toBe(false);
      });

      it('rejects protocol-relative URLs', () => {
        expect(isSafeRedirect('//evil.com', origin)).toBe(false);
      });

      it('rejects data URIs', () => {
        expect(isSafeRedirect('data:text/html,<script>alert(1)</script>', origin)).toBe(false);
      });

      it('rejects javascript URIs', () => {
        expect(isSafeRedirect('javascript:alert(1)', origin)).toBe(false);
      });
    });

    describe('Whitelist Validation', () => {
      it('rejects non-whitelisted internal paths', () => {
        expect(isSafeRedirect('/non-existent', origin)).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('non-whitelisted path')
        );
      });

      it('rejects paths not in ROUTES config', () => {
        expect(isSafeRedirect('/secret-admin-backdoor', origin)).toBe(false);
      });

      it('rejects paths with directory traversal attempts', () => {
        expect(isSafeRedirect('/admin/../../../etc/passwd', origin)).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('rejects root path (not in whitelist)', () => {
        // Root path is not in whitelist, so should be rejected
        expect(isSafeRedirect('/', origin)).toBe(false);
      });

      it('handles malformed URLs gracefully', () => {
        expect(isSafeRedirect('ht!tp://invalid', origin)).toBe(false);
        // Note: console.error IS called but we don't test implementation details
      });

      it('handles empty strings', () => {
        expect(isSafeRedirect('', origin)).toBe(false);
      });

      it('allows whitelisted paths with query parameters (query params validated by receiving page)', () => {
        // Query params don't execute on redirect - receiving page must sanitize
        // Only pathname is validated for whitelist
        expect(isSafeRedirect('/admin?redirect=<script>alert(1)</script>', origin)).toBe(true);
      });
    });

    describe('Origin Validation', () => {
      it('rejects URLs with different port', () => {
        expect(isSafeRedirect('http://localhost:3000/admin', origin)).toBe(false);
      });

      it('rejects URLs with different protocol', () => {
        expect(isSafeRedirect('https://localhost:4321/admin', origin)).toBe(false);
      });

      it('rejects URLs with different hostname', () => {
        expect(isSafeRedirect('http://127.0.0.1:4321/admin', origin)).toBe(false);
      });
    });
  });

  describe('validateRedirectUrl', () => {
    describe('Safe URL Pass-Through', () => {
      it('returns safe internal URLs unchanged', () => {
        expect(validateRedirectUrl('/admin', origin)).toBe('/admin');
        expect(validateRedirectUrl('/dashboard', origin)).toBe('/dashboard');
        expect(validateRedirectUrl('/account-disabled', origin)).toBe('/account-disabled');
      });

      it('preserves query parameters for safe URLs', () => {
        expect(validateRedirectUrl('/dashboard?tab=overview', origin)).toBe('/dashboard?tab=overview');
      });
    });

    describe('Fallback for Unsafe URLs', () => {
      it('uses default fallback for external URLs', () => {
        expect(validateRedirectUrl('https://evil.com', origin)).toBe('/login');
      });

      it('uses custom fallback when provided', () => {
        expect(validateRedirectUrl('https://evil.com', origin, '/dashboard')).toBe('/dashboard');
      });

      it('uses fallback for non-whitelisted paths', () => {
        expect(validateRedirectUrl('/non-existent', origin, '/admin')).toBe('/admin');
      });

      it('uses fallback for malformed URLs', () => {
        expect(validateRedirectUrl('ht!tp://invalid', origin, '/dashboard')).toBe('/dashboard');
      });
    });

    describe('Null and Empty Handling', () => {
      it('returns fallback for null input', () => {
        expect(validateRedirectUrl(null, origin, '/dashboard')).toBe('/dashboard');
      });

      it('returns fallback for empty string', () => {
        expect(validateRedirectUrl('', origin, '/admin')).toBe('/admin');
      });

      it('returns fallback for root path', () => {
        expect(validateRedirectUrl('/', origin, '/dashboard')).toBe('/dashboard');
      });

      it('returns fallback for login path (to avoid loops)', () => {
        expect(validateRedirectUrl('/login', origin, '/dashboard')).toBe('/dashboard');
      });
    });

    describe('Default Fallback Behavior', () => {
      it('uses /login as default fallback when not specified', () => {
        expect(validateRedirectUrl(null, origin)).toBe('/login');
        expect(validateRedirectUrl('https://evil.com', origin)).toBe('/login');
      });
    });

    describe('Security Attack Vectors', () => {
      it('blocks open redirect with query parameter manipulation', () => {
        const malicious = 'https://evil.com?fake=/admin';
        expect(validateRedirectUrl(malicious, origin, '/login')).toBe('/login');
      });

      it('blocks tabnabbing attack vectors', () => {
        expect(validateRedirectUrl('https://phishing-site.com', origin, '/login')).toBe('/login');
      });

      it('blocks URL-encoded external redirects', () => {
        const encoded = 'https%3A%2F%2Fevil.com';
        expect(validateRedirectUrl(encoded, origin, '/login')).toBe('/login');
      });
    });
  });

  describe('Integration Tests', () => {
    it('validates redirect flow: malicious attempt → safe fallback', () => {
      const userInput = 'https://evil.com/steal-data';
      const safeUrl = validateRedirectUrl(userInput, origin, '/dashboard');
      
      expect(safeUrl).toBe('/dashboard');
      expect(isSafeRedirect(safeUrl, origin)).toBe(true);
    });

    it('validates redirect flow: safe URL → passes through', () => {
      const userInput = '/admin';
      const safeUrl = validateRedirectUrl(userInput, origin, '/dashboard');
      
      expect(safeUrl).toBe('/admin');
      expect(isSafeRedirect(safeUrl, origin)).toBe(true);
    });

    it('handles chained redirect validation', () => {
      // First redirect attempt
      const firstAttempt = validateRedirectUrl('https://evil.com', origin, '/login');
      expect(firstAttempt).toBe('/login');
      
      // Verify the fallback is safe
      expect(isSafeRedirect(firstAttempt, origin)).toBe(true);
    });
  });
});
