<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Demo only: signs guests in as the seeded admin (DEMO_AUTO_LOGIN=true, local environment).
 */
class AutoLogin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('demo.auto_login') && app()->isLocal() && Auth::guest()) {
            $user = User::query()->where('email', config('demo.admin_email'))->first();

            if ($user !== null) {
                Auth::login($user);
            }
        }

        return $next($request);
    }
}
