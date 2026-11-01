<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A named php-script, edited in Filament (/admin/automations) and on the Blade page (/blade).
 *
 * @property int $id
 * @property string $name
 * @property string $script
 */
class Automation extends Model
{
    protected $fillable = ['name', 'script'];
}
