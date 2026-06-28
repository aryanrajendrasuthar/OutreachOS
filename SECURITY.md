# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **aryanrajendrasuthar@gmail.com** with:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

**Response timeline:**
- Acknowledge receipt within **48 hours**
- Provide an initial assessment within **5 business days**
- Release a patch within **14 days** for confirmed critical issues

## Out of Scope

- Rate limiting bypass via distributed clients
- LinkedIn ToS violations by end users (user responsibility)
- Social engineering attacks
- Denial of service via expensive API calls (mitigated by rate limiting)
- Issues requiring physical access to a server

## Recognition

We don't offer a monetary bug bounty. Researchers who responsibly disclose valid vulnerabilities will be credited in the CHANGELOG for the patched release.

## Security Architecture

OutreachOS implements the following controls:
- AES-256-GCM encryption for LinkedIn session cookies at rest
- TOTP 2FA available for all accounts
- JWT access tokens with 15-minute expiry
- HttpOnly, Secure, SameSite=Strict refresh token cookies
- Row Level Security on all Supabase tables
- Helmet security headers on all API responses
- Redis-backed rate limiting on auth and API endpoints
- IDOR prevention via ownership assertions on all mutations
- Zod validation on all API inputs
- Parameterized queries via Drizzle ORM (no raw SQL interpolation)
- TruffleHog + CodeQL scanning in CI
