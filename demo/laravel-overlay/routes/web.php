<?php

declare(strict_types=1);

use App\Http\Controllers\ScriptController;
use Illuminate\Support\Facades\Route;

Route::view('/', 'home')->name('home');

Route::get('/blade', [ScriptController::class, 'page'])->name('blade');
Route::get('/blade/{automation}', [ScriptController::class, 'page'])->name('blade.edit');

Route::controller(ScriptController::class)->prefix('scripts')->name('scripts.')->group(function (): void {
    Route::get('config', 'config')->name('config');
    Route::post('lint', 'lint')->name('lint');
    Route::post('/', 'store')->name('store');
    Route::get('{automation}', 'show')->name('show');
    Route::put('{automation}', 'update')->name('update');
});
