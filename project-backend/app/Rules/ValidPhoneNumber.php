<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class ValidPhoneNumber implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!preg_match('/^(03|05|07|08|09|01[2|6|8|9])+([0-9]{8})$/', $value)) {
            $fail('Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và gồm 10 chữ số).');
        }
    }
}
