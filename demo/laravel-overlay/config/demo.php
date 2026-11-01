<?php

declare(strict_types=1);

return [
    // Sign every visitor of /admin in as the seeded admin (only with APP_ENV=local).
    'auto_login' => (bool) env('DEMO_AUTO_LOGIN', true),

    'admin_email' => 'admin@example.com',
];
