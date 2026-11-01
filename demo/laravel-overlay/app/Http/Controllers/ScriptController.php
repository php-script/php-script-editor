<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Automation;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpScript\Core\Engine;
use PhpScript\Editor\Laravel\EditorConfig;
use PhpScript\Editor\Laravel\LintResponse;
use PhpScript\Editor\Laravel\Rules\ValidPhpScript;

/**
 * JSON endpoints of the `<x-php-script-editor>` Blade page: config, lint, save (POST, then PUT).
 * The element sends `{name, content}` (save-payload + save-field "content").
 */
class ScriptController extends Controller
{
    public function __construct(private readonly Engine $engine) {}

    // GET /blade and /blade/{automation}
    public function page(?Automation $automation = null): View
    {
        return view('blade-editor', ['automation' => $automation, 'engine' => $this->engine]);
    }

    // GET /scripts/config
    public function config(): EditorConfig
    {
        return EditorConfig::fromEngine($this->engine);
    }

    // POST /scripts/lint
    public function lint(Request $request): LintResponse
    {
        return LintResponse::fromEngine($this->engine, $request->string('content')->toString());
    }

    // GET /scripts/{automation}
    public function show(Automation $automation): JsonResponse
    {
        return response()->json($automation);
    }

    // POST /scripts: 422 with diagnostics (editor markers) for invalid scripts
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'string'],
        ]);

        LintResponse::abortIfInvalid($this->engine, $data['content']);

        $automation = Automation::query()->create([
            'name' => $data['name'] ?? 'Blade script',
            'script' => $data['content'],
        ]);

        return response()
            ->json($automation, 201)
            ->header('Location', route('scripts.update', $automation));
    }

    // PUT /scripts/{automation}: validated with the ValidPhpScript rule (message only)
    public function update(Request $request, Automation $automation): JsonResponse
    {
        $data = $request->validate([
            'content' => ['required', 'string', new ValidPhpScript($this->engine)],
        ]);

        $automation->update(['script' => $data['content']]);

        return response()->json($automation);
    }
}
