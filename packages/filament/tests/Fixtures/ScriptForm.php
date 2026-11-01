<?php

declare(strict_types=1);

namespace PhpScript\Editor\Filament\Tests\Fixtures;

use Closure;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Schemas\Concerns\InteractsWithSchemas;
use Filament\Schemas\Contracts\HasSchemas;
use Filament\Schemas\Schema;
use Livewire\Component;
use PhpScript\Editor\Filament\PhpScriptEditor;

class ScriptForm extends Component implements HasSchemas
{
    use InteractsWithSchemas;

    /** @var Closure(PhpScriptEditor): PhpScriptEditor|null */
    public static ?Closure $configure = null;

    /** @var array<string, mixed>|null */
    public ?array $data = [];

    /** @var array<string, mixed>|null */
    public ?array $saved = null;

    public function mount(): void
    {
        $this->form->fill(['script' => 'return order.total;']);
    }

    public function form(Schema $schema): Schema
    {
        $field = PhpScriptEditor::make('script')->engine(fn () => testEngine());

        return $schema
            ->components([static::$configure ? (static::$configure)($field) : $field])
            ->statePath('data');
    }

    public function save(): void
    {
        $this->saved = $this->form->getState();
    }

    public function render(): string
    {
        return '<div>{{ $this->form }}</div>';
    }
}
