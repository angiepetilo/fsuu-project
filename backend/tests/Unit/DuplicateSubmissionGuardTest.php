<?php

namespace Tests\Unit;

use App\Services\DuplicateSubmissionGuard;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DuplicateSubmissionGuardTest extends TestCase
{
    #[Test]
    public function it_normalizes_case_and_whitespace_for_names(): void
    {
        $this->assertSame('angie petilo', DuplicateSubmissionGuard::normalize('Angie Petilo'));
        $this->assertSame('angie petilo', DuplicateSubmissionGuard::normalize('ANGIE PETILO'));
        $this->assertSame('angie petilo', DuplicateSubmissionGuard::normalize('  angie   petilo  '));
    }

    #[Test]
    public function it_normalizes_case_and_whitespace_for_emails(): void
    {
        $this->assertSame('angie.petilo@urios.edu.ph', DuplicateSubmissionGuard::normalizeEmail('  Angie.Petilo@Urios.edu.ph '));
        $this->assertSame('angie.petilo@urios.edu.ph', DuplicateSubmissionGuard::normalizeEmail('ANGIE.PETILO@URIOS.EDU.PH'));
    }

    #[Test]
    public function it_treats_differently_cased_emails_as_the_same_identity(): void
    {
        $this->assertTrue(DuplicateSubmissionGuard::emailsEqual('angie.petilo@urios.edu.ph', 'ANGIE.PETILO@URIOS.EDU.PH'));
        $this->assertFalse(DuplicateSubmissionGuard::emailsEqual('angie.petilo@urios.edu.ph', 'other.person@urios.edu.ph'));
        $this->assertFalse(DuplicateSubmissionGuard::emailsEqual('', ''));
    }

    #[Test]
    public function it_flags_same_requestor_when_name_email_and_contact_all_match_regardless_of_casing(): void
    {
        $incoming = [
            'email' => 'ANGIE.PETILO@URIOS.EDU.PH',
            'first_name' => 'Angie',
            'last_name' => 'Petilo',
            'contact_number' => '09171234567',
        ];
        $existing = [
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'ANGIE',
            'last_name' => 'PETILO',
            'contact_number' => '09171234567',
        ];

        $this->assertTrue(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_does_not_flag_when_name_and_contact_match_but_email_differs(): void
    {
        // Same name + same contact number, but a different email -> NOT a duplicate
        // under the "all three must match" rule.
        $incoming = [
            'email' => 'kelesteangie@gmail.com',
            'first_name' => 'test 2',
            'last_name' => 'test 2',
            'contact_number' => '0942 432 4342',
        ];
        $existing = [
            'email' => 'angie.petiloo@gmail.com',
            'first_name' => 'TEST 2',
            'last_name' => 'TEST 2',
            'contact_number' => '0942 432 4342',
        ];

        $this->assertFalse(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_does_not_flag_when_name_and_email_match_but_contact_number_differs(): void
    {
        $incoming = [
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'Angie',
            'last_name' => 'Petilo',
            'contact_number' => '09171234567',
        ];
        $existing = [
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'angie',
            'last_name' => 'petilo',
            'contact_number' => '09179999999', // different contact number
        ];

        $this->assertFalse(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_does_not_flag_when_email_and_contact_match_but_name_differs(): void
    {
        $incoming = [
            'email' => 'shared.office@urios.edu.ph',
            'first_name' => 'John',
            'last_name' => 'Cruz',
            'contact_number' => '09171234567',
        ];
        $existing = [
            'email' => 'shared.office@urios.edu.ph',
            'first_name' => 'Jane',
            'last_name' => 'Reyes',
            'contact_number' => '09171234567',
        ];

        $this->assertFalse(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_does_not_flag_different_requestors_with_different_everything(): void
    {
        $incoming = [
            'email' => 'john.cruz.a@gmail.com',
            'first_name' => 'John',
            'last_name' => 'Cruz',
            'contact_number' => '09171234567',
        ];
        $existing = [
            'email' => 'john.cruz.b@gmail.com',
            'first_name' => 'John',
            'last_name' => 'Cruz',
            'contact_number' => '09179999999',
        ];

        $this->assertFalse(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_does_not_flag_when_names_are_blank_on_either_side(): void
    {
        $incoming = ['email' => 'a@gmail.com', 'first_name' => '', 'last_name' => '', 'contact_number' => '09171234567'];
        $existing = ['email' => 'a@gmail.com', 'first_name' => '', 'last_name' => '', 'contact_number' => '09171234567'];

        $this->assertFalse(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_does_not_flag_when_emails_are_blank_on_either_side(): void
    {
        $incoming = ['email' => null, 'first_name' => 'Angie', 'last_name' => 'Petilo', 'contact_number' => '09171234567'];
        $existing = ['email' => null, 'first_name' => 'Angie', 'last_name' => 'Petilo', 'contact_number' => '09171234567'];

        $this->assertFalse(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_does_not_flag_when_contact_numbers_are_blank_on_either_side(): void
    {
        $incoming = ['email' => 'a@gmail.com', 'first_name' => 'Angie', 'last_name' => 'Petilo', 'contact_number' => ''];
        $existing = ['email' => 'a@gmail.com', 'first_name' => 'Angie', 'last_name' => 'Petilo', 'contact_number' => ''];

        $this->assertFalse(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_flags_same_requestor_when_venue_name_email_and_contact_all_match(): void
    {
        $incoming = [
            'venue_id' => 2,
            'email' => 'ANGIE.PETILO@URIOS.EDU.PH',
            'first_name' => 'Angie',
            'last_name' => 'Petilo',
            'contact_number' => '09171234567',
        ];
        $existing = [
            'venue_id' => 2,
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'ANGIE',
            'last_name' => 'PETILO',
            'contact_number' => '09171234567',
        ];

        $this->assertTrue(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_does_not_flag_when_name_email_and_contact_match_but_venue_differs(): void
    {
        // Same person, same identity details, but booking a DIFFERENT venue -> not a duplicate.
        $incoming = [
            'venue_id' => 2,
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'Angie',
            'last_name' => 'Petilo',
            'contact_number' => '09171234567',
        ];
        $existing = [
            'venue_id' => 5,
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'Angie',
            'last_name' => 'Petilo',
            'contact_number' => '09171234567',
        ];

        $this->assertFalse(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_skips_the_venue_check_when_either_side_omits_venue_id(): void
    {
        // Equipment borrowing identity arrays never set 'venue_id' at all, so the
        // venue comparison must be skipped entirely rather than treated as a mismatch.
        $incoming = [
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'Angie',
            'last_name' => 'Petilo',
            'contact_number' => '09171234567',
        ];
        $existing = [
            'venue_id' => 5,
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'Angie',
            'last_name' => 'Petilo',
            'contact_number' => '09171234567',
        ];

        $this->assertTrue(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }

    #[Test]
    public function it_does_not_flag_when_venue_id_is_null_on_either_side(): void
    {
        $incoming = [
            'venue_id' => null,
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'Angie',
            'last_name' => 'Petilo',
            'contact_number' => '09171234567',
        ];
        $existing = [
            'venue_id' => 2,
            'email' => 'angie.petilo@urios.edu.ph',
            'first_name' => 'Angie',
            'last_name' => 'Petilo',
            'contact_number' => '09171234567',
        ];

        $this->assertFalse(DuplicateSubmissionGuard::isSameRequestor($incoming, $existing));
    }
}
