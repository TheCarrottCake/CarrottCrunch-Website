import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContentBody } from '../app/components/content-body.ts';

async function editor() {
  const module = { exports: {} };
  const imports = { react: React, 'react/jsx-runtime': jsx, './content-body': { ContentBody },
    'react-router': { Form: 'form', Link: ({ to, ...props }) => React.createElement('a', { ...props, href: to }), useNavigation: () => ({ state: 'idle' }) },
  };
  const source = await readFile('app/components/announcement-editor.tsx', 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: key => {
    assert.ok(key in imports, `Unexpected editor import: ${key}`);
    return imports[key];
  } });
  return module.exports.AnnouncementEditor;
}

test('announcement preview uses the public renderer, escapes fields and preserves conflicting text', async () => {
  const Component = await editor();
  const initial = { title: '<img src=x onerror=alert(1)>', summary: '<script>summary</script>', bodyText: '## Safe heading\n\n**Bold** [Unsafe](javascript:alert(1))\n\n<script>alert(1)</script>', revision: '7' };
  const html = renderToStaticMarkup(React.createElement(Component, { initial, csrf: 'test-only-csrf', conflict: true, message: 'This draft changed. Your text is preserved.' }));
  assert.ok(html.includes(renderToStaticMarkup(React.createElement(ContentBody, { text: initial.bodyText }))));
  assert.doesNotMatch(html, /<script|<img|href="javascript:|dangerouslySetInnerHTML/);
  assert.match(html, /&lt;script&gt;summary&lt;\/script&gt;/);
  assert.match(html, /name="revision" value="7"/);
  assert.match(html, /name="_csrf" value="test-only-csrf"/);
  assert.match(html, /disabled=""[^>]*>Save draft/);
  assert.match(html, /role="alert"/);
  for (const id of ['announcement-title', 'announcement-summary', 'announcement-body']) assert.ok(html.includes(`for="${id}"`) && html.includes(`id="${id}"`));
  assert.match(html, /Copy your changes before reloading/);
});
