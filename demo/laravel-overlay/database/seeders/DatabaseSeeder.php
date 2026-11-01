<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Automation;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Idempotent: runs on every container start.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => config('demo.admin_email')],
            ['name' => 'Admin', 'password' => 'password', 'email_verified_at' => now()],
        );

        Automation::query()->firstOrCreate(
            ['name' => 'Welcome message'],
            ['script' => <<<'PHPSCRIPT'
                // Greets adult users, then lists the items.
                if (user.isAdult()) {
                    echo user.greet("Welcome");
                }

                foreach (items as item) {
                    echo item;
                }

                return round(count(items) * taxRate, 2);
                PHPSCRIPT],
        );
    }
}
