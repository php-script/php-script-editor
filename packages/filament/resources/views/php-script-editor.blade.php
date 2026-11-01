@php
    $statePath = $getStatePath();
    $isDisabled = $isDisabled() || $field->isReadOnly();
@endphp

<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div
        x-data="{
            state: $wire.{{ $applyStateBindingModifiers("\$entangle('{$statePath}')", isOptimisticallyLive: false) }},
            isDirty: false,
            init() {
                {{-- Blade swallows the newline after @js(), so every statement ends with a semicolon. --}}
                {{-- live(): the entangle above is live. live(debounce:) / live(onBlur:) commit here. --}}
                const el = this.$refs.editor;
                const isLiveOnBlur = @js($isLiveOnBlur());
                const isLiveDebounced = @js($isLiveDebounced());
                const commit = Alpine.debounce(() => this.$wire.$commit(), @js($getLiveDebounce() ?? 300));

                {{-- Set before the element upgrades: Lit picks up the pre-upgrade property. --}}
                el.value = this.state ?? '';

                el.addEventListener('input', () => {
                    if (el.value === (this.state ?? '')) return;
                    this.isDirty = true;
                    this.state = el.value;
                    if (isLiveDebounced && ! isLiveOnBlur) commit();
                });

                el.addEventListener('change', () => {
                    if (isLiveOnBlur && this.isDirty) this.$wire.$commit();
                    this.isDirty = false;
                });

                this.$watch('state', (value) => {
                    value = value ?? '';
                    if (value !== el.value) el.value = value;
                });

                if (! window.customElements.get('php-script-editor')) {
                    import(@js($getScriptSrc())).catch((error) => console.error('[php-script-editor] loading the editor failed', error));
                }
            },
        }"
        wire:ignore
        wire:key="{{ $getLivewireKey() }}.{{ substr(md5(serialize([$isDisabled])), 0, 8) }}"
        {{ $getExtraAttributeBag()->class(['fi-fo-php-script-editor']) }}
    >
        <php-script-editor x-ref="editor"{{ $getEditorAttributesHtml() }}></php-script-editor>
    </div>
</x-dynamic-component>
