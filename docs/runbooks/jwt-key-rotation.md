# JWT Key Management and Service Authentication

## RSA Key Generation

```bash
# Generate RSA-2048 key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Export as environment variables
export JWT_PRIVATE_KEY=$(cat private.pem | base64)
export JWT_PUBLIC_KEY=$(cat public.pem | base64)
```

## Key Rotation Process

### Step 1: Generate New Key Pair
```bash
openssl genrsa -out private_new.pem 2048
openssl rsa -in private_new.pem -pubout -out public_new.pem
```

### Step 2: Update JWKS Endpoint
- Auth service fetches new public key
- Returns both old and new keys in JWKS endpoint for 24 hours

### Step 3: Update Services
- Services fetch updated JWKS
- Accept tokens signed by either key during 24-hour overlap

### Step 4: Complete Rotation
- After 24 hours, remove old key from JWKS
- Set `JWT_KEY_VALID_UNTIL` to previous key to reject tokens from old key

## JWKS Endpoint Response

```json
{
  "keys": [
    {
      "kid": "key_id_1",
      "kty": "RSA",
      "use": "sig",
      "n": "base64-encoded-modulus",
      "e": "AQAB",
      "alg": "RS256",
      "validFrom": "2026-04-17T00:00:00Z",
      "validUntil": "2026-05-17T00:00:00Z"
    },
    {
      "kid": "key_id_2",
      "kty": "RSA",
      "use": "sig",
      "n": "base64-encoded-modulus",
      "e": "AQAB",
      "alg": "RS256",
      "validFrom": "2026-05-17T00:00:00Z"
    }
  ]
}
```

## Service-to-Service Authentication

Services use short-lived JWT tokens to authenticate to each other:

```typescript
const serviceToken = jwt.sign(
  {
    sub: 'service:order-service',
    aud: 'service:payment-service',
    scope: 'internal',
  },
  process.env.SERVICE_SECRET,
  { expiresIn: '5m' },
);
```

### Security
- Service secret different from user JWT secret
- 5-minute expiry limits blast radius
- Revocation via Redis token blacklist if needed
