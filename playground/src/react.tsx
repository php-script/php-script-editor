import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PhpScriptEditor,
  type PhpScriptConfig,
  type PhpScriptEditorHandle,
} from '@php-script/editor-react';
import { SAMPLE, renderChrome, runScript } from './chrome.js';

renderChrome('react');

function App() {
  const [code, setCode] = useState(SAMPLE);
  const [config, setConfig] = useState<PhpScriptConfig | null>(null);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('');
  const editor = useRef<PhpScriptEditorHandle>(null);

  useEffect(() => {
    void fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  return (
    <main>
      <section className="card">
        <h2>React (controlled)</h2>
        {config && (
          <PhpScriptEditor
            ref={editor}
            value={code}
            onChange={setCode}
            config={config}
            saveUrl="/api/scripts"
            persisted={false}
            height="18rem"
            onSave={(r) => setStatus(`${r.method} ${r.url} -> ${r.status}`)}
            onSaveError={(e) => setStatus(`error: ${e.message}`)}
          />
        )}
        <p>
          <button
            type="button"
            data-testid="run"
            onClick={async () => setOutput(await runScript(code))}
          >
            Run
          </button>{' '}
          <button type="button" data-testid="reset" onClick={() => setCode('echo "reset";')}>
            Reset from React state
          </button>
        </p>
        <pre data-testid="status">{status}</pre>
        <pre data-testid="output">{output}</pre>
        <pre data-testid="mirror">{code}</pre>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
