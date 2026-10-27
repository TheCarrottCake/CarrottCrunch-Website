import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const master = readFileSync(new URL('../public/branding/CarrottCrunch-Icon-Master.svg', import.meta.url), 'utf8');
const icon = readFileSync(new URL('../public/branding/carrottcrunch-icon.svg', import.meta.url), 'utf8');

// Compare source geometry and its transform ancestry, including rotated crumbs.
function artwork(source) {
  const groups = [];
  const paths = [];
  for (const [, closing, tag, attributes] of source.matchAll(/<(\/?)(g|path)(?=[\s/>])([^>]*)>/g)) {
    if (closing) { if (tag === 'g') groups.pop(); continue; }
    const attrs = Object.fromEntries([...attributes.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
    if (tag === 'g') {
      if (!attributes.trimEnd().endsWith('/')) groups.push(attrs.transform || '');
    } else {
      const style = Object.fromEntries((attrs.style || '').split(';').filter(Boolean).map(value => value.split(':')));
      paths.push({ d: attrs.d, transforms: [...groups, attrs.transform || ''].filter(Boolean), fill: (attrs.fill || style.fill).toUpperCase() });
    }
  }
  return paths;
}

test('browser logo preserves the master C, three leaves and three crumbs exactly', () => {
  assert.equal(artwork(master).length, 7);
  assert.deepEqual(artwork(icon), artwork(master));
  assert.deepEqual(artwork(icon).map(path => path.fill), ['#B64223', ...Array(3).fill('#6C8056'), ...Array(3).fill('#F4A453')]);
});

test('SVG favicon uses the official artwork and accessible sage text variants meet AA', () => {
  assert.equal(readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8'), icon);
  const css = readFileSync(new URL('../app/palette.css', import.meta.url), 'utf8');
  const token = name => css.match(new RegExp(`--${name}: (#[0-9A-F]{6});`))[1];
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  for (const [foreground, background] of [['foliage-text', 'surface'], ['foliage-text', 'page-bg'], ['foliage-on-dark', 'featured']]) {
    const values = [luminance(token(foreground)), luminance(token(background))].sort((a, b) => b - a);
    assert.ok((values[0] + .05) / (values[1] + .05) >= 4.5, `${foreground} on ${background} must meet AA`);
  }
});

test('browser logo has transparent, padded bounds and no editor or external dependencies', () => {
  assert.doesNotMatch(icon, /<(?:rect|image|script|foreignObject|defs)\b|inkscape:|sodipodi:|\bhref=/);
  assert.match(icon, /preserveAspectRatio="xMidYMid meet"/);
  const viewBox = icon.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  // Independently measured Inkscape artwork bounds in master viewBox units.
  const [x, y, width, height] = [2.5, 3.3757, 124.801, 168.5234];
  const margins = [x - viewBox[0], y - viewBox[1], viewBox[0] + viewBox[2] - x - width, viewBox[1] + viewBox[3] - y - height];
  for (const margin of margins) assert.ok(Math.abs(margin - 6) < .002, `Expected balanced six-unit padding, got ${margin}`);
});
