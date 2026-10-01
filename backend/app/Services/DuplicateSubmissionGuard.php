<?php

namespace App\Services;

/**
 * DuplicateSubmissionGuard
 *
 * Centralizes the "is this the same person submitting again" identity check used by
 * VenueBookingService and EquipmentBorrowingService to block duplicate requests for
 * the same venue/equipment slot.
 *
 * Standard applied here:
 *   - Never compare raw user input directly — normalize (trim + lowercase, collapse
 *     internal whitespace) BOTH the incoming value and the stored value before
 *     comparing, so "Angie Petilo", "ANGIE PETILO", and "  angie   petilo " are all
 *     treated as the same identity regardless of database collation.
 *   - Do the normalization explicitly in PHP rather than relying on MySQL's default
 *     collation being case-insensitive, so behavior is deliberate and portable across
 *     database engines.
 *   - A request is flagged as a duplicate ONLY when ALL of the following match: the
 *     same venue selected, AND (normalized, case-insensitive) full name, email
 *     address, AND contact number. All must agree — a match on only some of these
 *     fields is NOT enough to flag a duplicate (e.g. a shared office contact number
 *     alone does not imply the same requestor; the same name/email/contact at a
 *     DIFFERENT venue is not a duplicate either).
 *   - The venue check only applies when BOTH sides actually provide a `venue_id`
 *     (equipment borrowing has no venue concept, so this check is skipped there).
 *
 * Queries should still scope candidates by venue/equipment + overlapping date-time +
 * status (cheap, indexed) BEFORE calling into this class — this class only performs
 * the normalized field comparison against that already-narrow candidate set, avoiding
 * fragile/expensive whitespace-collapsing SQL.
 */
class DuplicateSubmissionGuard
{
    /**
     * Normalize a free-text value for identity comparison: trim, lowercase,
     * and collapse repeated internal whitespace to a single space.
     */
    public static function normalize(mixed $value): string
    {
        $value = mb_strtolower(trim((string) ($value ?? '')));
        $value = preg_replace('/\s+/', ' ', $value) ?? $value;
        return $value;
    }

    /**
     * Normalize an email address for identity comparison: trim + lowercase.
     */
    public static function normalizeEmail(mixed $value): string
    {
        return mb_strtolower(trim((string) ($value ?? '')));
    }

    /**
     * True if two free-text values are equal once normalized (case/whitespace-insensitive).
     */
    public static function equal(mixed $a, mixed $b): bool
    {
        return self::normalize($a) === self::normalize($b);
    }

    /**
     * True if two email addresses are equal once normalized.
     */
    public static function emailsEqual(mixed $a, mixed $b): bool
    {
        $na = self::normalizeEmail($a);
        $nb = self::normalizeEmail($b);
        return $na !== '' && $na === $nb;
    }

    /**
     * Determine whether an incoming submission and an existing candidate row
     * represent the SAME requestor, per the standard described above:
     *   - same venue selected (when both sides provide a venue_id), AND
     *   - normalized full name match, AND
     *   - normalized email match, AND
     *   - normalized contact number match.
     * All must agree; if any one is blank on either side or differs, this
     * returns false.
     *
     * $incoming / $existing are associative arrays with any of the keys:
     *   venue_id, email, first_name, last_name, contact_number
     * (program_office, purpose, persons may still be passed through but are not
     * used by this check.)
     */
    public static function isSameRequestor(array $incoming, array $existing): bool
    {
        // Venue signal: only enforced when BOTH sides provide a venue_id (equipment
        // borrowing has no venue concept and will simply omit this key).
        if (array_key_exists('venue_id', $incoming) && array_key_exists('venue_id', $existing)) {
            $incomingVenueId = $incoming['venue_id'];
            $existingVenueId = $existing['venue_id'];
            if ($incomingVenueId === null || $existingVenueId === null || (string) $incomingVenueId !== (string) $existingVenueId) {
                return false;
            }
        }

        $incomingName = trim(($incoming['first_name'] ?? '') . ' ' . ($incoming['last_name'] ?? ''));
        $existingName = trim(($existing['first_name'] ?? '') . ' ' . ($existing['last_name'] ?? ''));

        if ($incomingName === '' || $existingName === '' || !self::equal($incomingName, $existingName)) {
            return false;
        }

        $incomingEmail = $incoming['email'] ?? null;
        $existingEmail = $existing['email'] ?? null;
        if (!self::emailsEqual($incomingEmail, $existingEmail)) {
            return false;
        }

        $incomingContact = $incoming['contact_number'] ?? '';
        $existingContact = $existing['contact_number'] ?? '';
        if (self::normalize($incomingContact) === '' || self::normalize($existingContact) === '') {
            return false;
        }

        return self::equal($incomingContact, $existingContact);
    }
}
