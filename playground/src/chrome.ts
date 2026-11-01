import './shared.css';

const pages = [
  ['vanilla', 'Vanilla / Alpine'],
  ['react', 'React'],
  ['vue', 'Vue'],
  ['svelte', 'Svelte'],
  ['standalone', 'Standalone (Laravel / Filament)'],
] as const;

/** Header with page links and a dark-mode toggle (`html.dark`, like Filament). */
export function renderChrome(current: string): void {
  const header = document.createElement('header');
  header.innerHTML = `<nav>${pages
    .map(
      ([id, label]) =>
        `<a href="/${id}.html"${id === current ? ' aria-current="page"' : ''}>${label}</a>`,
    )
    .join('')}</nav><button type="button" data-testid="toggle-dark">Toggle dark</button>`;
  header.querySelector('button')!.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('dark', document.documentElement.classList.contains('dark') ? '1' : '');
  });
  if (localStorage.getItem('dark')) document.documentElement.classList.add('dark');
  document.body.prepend(header);
}

/** Runs the script on the dev server and shows the result. */
export async function runScript(code: string): Promise<string> {
  const response = await fetch('/api/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: code }),
  });
  const data = (await response.json()) as { output?: string; message?: string };
  return response.ok ? (data.output ?? '') : `Error: ${data.message}`;
}

export const SAMPLE = `// Context: user, items, taxRate
if (user.isAdult()) {
    echo user.greet("Hello");
}
foreach (items as item) {
    echo item;
}
`;
