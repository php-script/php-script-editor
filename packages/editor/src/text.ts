/**
 * Cleans script text written inline in HTML/Blade: drops blank first/last lines and the
 * indentation shared by all non-empty lines. Relative indentation inside the script stays.
 */
export function dedent(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && lines[0]!.trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1]!.trim() === '') lines.pop();
  const indents = lines.filter((l) => l.trim() !== '').map((l) => /^[ \t]*/.exec(l)![0].length);
  const common = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(Math.min(common, /^[ \t]*/.exec(l)![0].length))).join('\n');
}
