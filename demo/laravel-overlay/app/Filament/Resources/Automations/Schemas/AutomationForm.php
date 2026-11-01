<?php

declare(strict_types=1);

namespace App\Filament\Resources\Automations\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;
use PhpScript\Core\Engine;
use PhpScript\Editor\Filament\PhpScriptEditor;

class AutomationForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                PhpScriptEditor::make('script')
                    ->engine(fn (): Engine => app(Engine::class)) // highlighting + completions
                    ->validateScript()                             // ValidPhpScript, same engine
                    ->required()
                    ->lintUrl(route('scripts.lint'))               // live diagnostics while typing
                    ->theme('auto')                                // follows Filament's dark mode
                    ->height('20rem')
                    ->helperText('Variables: user, items, taxRate. Ctrl+Space for completions.')
                    ->columnSpanFull(),
            ]);
    }
}
