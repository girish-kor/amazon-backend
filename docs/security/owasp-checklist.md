/**
 * OWASP Security Hardening Checklist
 */

export const OWASP_CHECKLIST = {
  'A01:2021 - Injection': {
    requirement: 'Parameterized queries only - no string concatenation',
    enforcement: 'ESLint rule: forbid raw SQL queries',
    verified: false,
  },
  'A02:2021 - Broken Authentication': {
    requirement: 'JWT validation on all authenticated routes',
    enforcement: 'Middleware applied to all protected routes',
    verified: false,
  },
  'A03:2021 - Broken Access Control': {
    requirement: 'User can only access own resources (userId check)',
    enforcement: 'Route-level authorization checks',
    verified: false,
  },
  'A04:2021 - Insecure Deserialization': {
    requirement: 'Strict JSON parsing - no eval()',
    enforcement: 'Zod schemas for all inputs',
    verified: false,
  },
  'A05:2021 - Broken Access Control': {
    requirement: 'Service credentials never in logs',
    enforcement: 'Log sanitization middleware',
    verified: false,
  },
  'A06:2021 - Vulnerable and Outdated Components': {
    requirement: 'npm audit passes in CI',
    enforcement: 'CI/CD gate blocks on CRITICAL vulnerabilities',
    verified: false,
  },
  'A07:2021 - Identification and Authentication Failures': {
    requirement: 'Account lockout after 5 failed attempts',
    enforcement: 'Redis-backed attempt tracking',
    verified: false,
  },
  'A08:2021 - Software and Data Integrity Failures': {
    requirement: 'Docker images scanned with Trivy',
    enforcement: 'CI blocks on CRITICAL image vulnerabilities',
    verified: false,
  },
  'A09:2021 - Logging and Monitoring Failures': {
    requirement: 'All security-relevant events logged',
    enforcement: 'Structured logging with sanitization',
    verified: false,
  },
  'A10:2021 - SSRF': {
    requirement: 'All external URLs validated against allowlist',
    enforcement: 'URL validation middleware',
    verified: false,
  },
};

# Security Middleware Stack

All services apply this middleware stack in order:

1. **Helmet** - Sets security headers (HSTS, CSP, X-Frame-Options, etc.)
2. **CORS** - Explicit allowlist, not wildcard
3. **Request Size Limit** - Reject bodies > 1MB
4. **Request ID Injection** - X-Request-ID header
5. **Zod Validation** - Every route has input schema
6. **Authentication** - JWT validation middleware
7. **Authorization** - Resource ownership checks
8. **Rate Limiting** - Per-IP rate limits at gateway

## Implementation in Express

```typescript
import helmet from 'helmet';
import cors from 'cors';
import { z } from 'zod';
import { requestIdMiddleware, authMiddleware } from '@shared/middleware';

app.use(helmet());
app.use(cors({ origin: ['https://domain.com'] }));
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);

// Route with validation and auth
router.post('/orders', 
  authMiddleware,  // Require JWT
  validateRequest(z.object({
    items: z.array(z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive(),
    })),
    shippingAddress: z.object({
      street: z.string(),
      city: z.string(),
    }),
  })),
  async (req, res) => {
    // Handle request
  }
);
```
