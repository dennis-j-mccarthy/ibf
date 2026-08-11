// Template bodies are written in a deliberately small markup so the same source
// renders three ways: on-screen HTML, clipboard HTML (for pasting into an email
// client or HubSpot), and plain text (for pasting anywhere else).
//
//   ## Heading          -> heading
//   - bullet            -> list item
//   blank line          -> paragraph break
//   **bold**            -> bold
//
// Nothing else is supported on purpose: coordinators paste this into Gmail,
// Word, and school newsletter CMSes, and anything fancier survives poorly.

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

export function toHtml(body: string): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`);
    list = [];
  };

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      out.push(`<h3>${inline(line.slice(3))}</h3>`);
      continue;
    }
    if (line.startsWith('- ')) {
      list.push(line.slice(2));
      continue;
    }
    flush();
    out.push(`<p>${inline(line)}</p>`);
  }
  flush();
  return out.join('\n');
}

export function toPlainText(body: string): string {
  return body
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (t.startsWith('## ')) return t.slice(3);
      if (t.startsWith('- ')) return `• ${t.slice(2)}`;
      return t;
    })
    .join('\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
