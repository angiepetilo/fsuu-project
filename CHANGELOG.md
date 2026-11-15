# Changelog

All notable changes to the FSUU AVR Booking System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Added `SecurityHeadersMiddleware` for enhanced HTTP security headers
- Fixed CORS wildcard vulnerability (removed `*` fallback)
- Added Content Security Policy (CSP) headers
- Added Strict-Transport-Security (HSTS) header for HTTPS enforcement
- Added X-Frame-Options, X-Content-Type-Options, X-XSS-Protection headers
- Implemented Permissions-Policy header
- Added GitHub Actions security scanning workflow
- Enforced strict `@urios.edu.ph` institutional domain validation on public booking and borrowing forms
- Allowed both `@urios.edu.ph` and personal `@gmail.com` with Abstract API anti-bot and deliverability validation in the authenticated staff/admin portal interface

### Documentation
- Added comprehensive `SECURITY.md` with security policies and best practices
- Added `DEPLOYMENT_CHECKLIST.md` for production deployment guidance
- Updated `.env.example` with stronger password guidance
- Added security audit report with detailed vulnerability assessment

### Changed
- Upgraded CorsMiddleware to never return wildcard (`*`) origins
- Enhanced error handling in API responses
- Improved rate limiting on authentication endpoints

## [1.0.0] - 2026-11-08

### Added
- Initial release of FSUU AVR Booking System
- Venue booking and equipment borrowing functionality
- Laravel 12 backend with PHP 8.2/8.3 support
- React 19 frontend with Vite 8
- Laravel Sanctum authentication
- Real-time notifications with Pusher
- Email notifications via SMTP
- SMS notifications via iPROG Gateway
- Barcode scanning for equipment tracking
- Audit logging system
- Role-based access control (RBAC)
- Dynamic fee matrix configuration
- Operating hours management
- Academic term archiving
- TiDB Cloud integration for scalability
- Cloudinary integration for file storage
- Docker containerization
- Comprehensive test suite

### Security
- Laravel Sanctum token-based authentication
- Rate limiting on all critical endpoints
- CSRF protection
- SQL injection prevention via parameterized queries
- XSS protection through input sanitization
- Password hashing with bcrypt (12 rounds)
- Session timeout (120 minutes)
- Idempotency middleware for duplicate prevention
- Email verification with OTP
- Phone verification with SMS OTP
- Disposable email detection
- Security alert system

---

## Security Advisories

### November 8, 2026 - Security Hardening Release
**Status:** ✅ Resolved

**Issues Addressed:**
1. ✅ Verified `.env` files are properly gitignored
2. ✅ Added SecurityHeadersMiddleware
3. ✅ Fixed CORS wildcard vulnerability
4. ✅ Enhanced security documentation
5. ✅ Added automated security scanning

**Recommended Actions:**
- Update all environments to include SecurityHeadersMiddleware
- Review and update CORS configuration for production
- Set strong database passwords (16+ characters)
- Rotate all API keys if previously exposed

---

## Migration Notes

### From Development to Production

**Critical Steps:**
1. Copy `.env.example` to `.env` (do NOT copy existing `.env`)
2. Set `APP_ENV=production` and `APP_DEBUG=false`
3. Generate new `APP_KEY` with `php artisan key:generate`
4. Set all production credentials (database, mail, API keys)
5. Run migrations: `php artisan migrate --force`
6. Test all functionality before going live

**PHP Version:**
- Minimum: PHP 8.2
- Recommended: PHP 8.3 (production Docker uses 8.3)

---

## Contributors

- FSUU IT Development Team
- AVR Operations Management
- Security Audit by Kiro AI

---

## License

© 2026 Father Saturnino Urios University. All rights reserved.

This software is proprietary and confidential.
