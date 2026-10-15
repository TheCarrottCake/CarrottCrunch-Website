import { createElement as h } from 'react';
import type { ReactNode } from 'react';

export function safeContentHref(value: string): string | null {
  if (/^\/(?!\/)/.test(value) && !/[\\\s\u0000-\u001f]/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function inline(text: string): ReactNode[] {
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    nodes.push(text.slice(cursor, match.index));
    const key = match.index;
    if (match[1]) nodes.push(h('strong', { key }, match[1]));
    else if (match[2]) nodes.push(h('em', { key }, match[2]));
    else if (match[3]) nodes.push(h('code', { key }, match[3]));
    else {
      const href = safeContentHref(match[5]);
      nodes.push(href ? h('a', { key, href, rel: 'noreferrer' }, match[4]) : match[4]);
    }
    cursor = match.index + match[0].length;
  }
  nodes.push(text.slice(cursor));
  return nodes;
}

/** A deliberately small Markdown subset. Raw HTML always remains escaped text. */
export function ContentBody({ text }: { text: string }) {
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).filter(Boolean);
  return h('div', { className: 'content-body' }, blocks.map((block, key) => {
    if (/^###? /.test(block)) {
      return h(block.startsWith('### ') ? 'h3' : 'h2', { key }, ...inline(block.replace(/^###? /, '')));
    }
    const lines = block.split('\n');
    if (lines.every(line => line.startsWith('- '))) {
      return h('ul', { key }, lines.map((line, index) => h('li', { key: index }, ...inline(line.slice(2)))));
    }
    return h('p', { key }, ...inline(block));
  }));
}
