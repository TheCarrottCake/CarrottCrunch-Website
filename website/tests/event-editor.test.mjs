import { toolbarComponents } from './fixtures/toolbar-components.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { ContentBody } from '../app/components/content-body.ts';
import * as eventTime from '../app/lib/event-time.ts';
import * as eventDisplay from '../app/lib/event-display.ts';

async function components(react = React) {
  const imports = { react, 'react/jsx-runtime': jsx, '../lib/event-time': eventTime, '../lib/event-display': eventDisplay,
    './content-body': { ContentBody }, 'react-router': { Form: 'form', Link: ({ to, ...props }) => React.createElement('a', { ...props, href: to }), useNavigation: () => ({ state: 'idle' }) } };
  imports['./editor-toolbar'] = (await toolbarComponents(react)).imports['./editor-toolbar'];
  async function load(file) {
    const module = { exports: {} };
    const source = await readFile(file, 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(output, { module, exports: module.exports, require: key => { assert.ok(key in imports, `Unexpected import ${key}`); return imports[key]; } });
    return module.exports;
  }
  imports['./news-events'] = await load('app/components/news-events.tsx');
  return { ...await load('app/components/event-editor.tsx'), ...imports['./news-events'] };
}
const initial = { title: '<script>TEST ONLY title</script>', bodyText: '## TEST ONLY\n\n<script>unsafe</script> [bad](javascript:alert(1))', startLocal: '2026-11-01T01:15:00.123', endLocal: '2026-11-01T01:45:00.456', timezone: 'America/Toronto', startOccurrence: 'earlier', endOccurrence: 'later', revision: '7' };
const now = Date.parse('2026-10-18T12:00:00Z');

test('event scheduling uses a date and quarter-hour AM/PM dropdowns, with friendly DST choices', async () => {
  const { EventEditor } = await components();
  const html = render(React.createElement(EventEditor, { initial, csrf: 'test-only', now, conflict: true, message: 'TEST ONLY conflict' }));
  assert.doesNotMatch(html, /<script|href="javascript:|dangerouslySetInnerHTML/);
  assert.ok(html.includes(render(React.createElement(ContentBody, { text: initial.bodyText }))));
  assert.equal((html.match(/type="date"/g) || []).length, 1);
  assert.equal((html.match(/<select/g) || []).length, 2);
  assert.match(html, /First 1:15 AM/); assert.match(html, /Second 1:45 AM/);
  assert.equal(eventTime.eventTimeOptions.length, 96);
  assert.deepEqual(eventTime.eventTimeOptions.slice(0, 2).map(o => o.label), ['12:00 AM', '12:15 AM']);
  assert.equal(eventTime.eventTimeOptions[48].label, '12:00 PM');
  assert.doesNotMatch(html, /datetime-local|name="timezone"/);
  const visible = html.replace(/<[^>]*>/g, '');
  assert.doesNotMatch(visible, /UTC|GMT|\.123|\.456|2026-11-01T/);
  assert.match(visible, /November 1, 2026/); assert.match(visible, /Toronto time/);
  assert.match(html, /name="startOccurrence"[^>]*checked=""[^>]*value="earlier"/);
  assert.match(html, /name="endOccurrence"[^>]*checked=""[^>]*value="later"/);
  assert.match(html, /value="2026-11-01T01:15:00.123"/);
  assert.match(html, /name="revision" value="7"/);
  assert.match(html, /role="alert"/); assert.match(html, /form="event-editor-form"[^>]*disabled=""/);
  assert.match(html, /Copy your changes before reloading/);
});

test('event preview refuses nonexistent local times and does not invent event timing', async () => {
  const { EventEditor } = await components();
  const html = render(React.createElement(EventEditor, { initial: { ...initial, startLocal: '2026-03-08T02:30', startOccurrence: '' }, csrf: 'test', now, errors: { title: 'TEST ONLY validation' } }));
  assert.match(html, /clocks jump forward/); assert.doesNotMatch(html, /class="event-time"/);
  assert.match(html, /value="2026-03-08T02:30"/); assert.match(html, /TEST ONLY validation/);
});

test('changing a time clears its occurrence while preserving the other saved endpoint', async () => {
  let state;
  const { EventEditor } = await components({ ...React, useState: value => [state ??= value, next => { state = next(state); }] });
  const props = { initial, csrf: 'test', now };
  const field = tree => tree.props.children.find(child => child?.props?.className === 'studio-editor-grid').props.children[0].props.children.find(child => child?.props?.change);
  field(EventEditor(props)).props.change('startLocal', '2026-11-01T01:20');
  assert.equal(state.startOccurrence, ''); assert.equal(state.endOccurrence, 'later');
  field(EventEditor(props)).props.change('endLocal', '2026-11-01T02:00');
  assert.equal(state.startOccurrence, ''); assert.equal(state.endOccurrence, '');
  assert.equal(state.startLocal, '2026-11-01T01:20'); assert.equal(state.bodyText, initial.bodyText);
});

test('multi-day and existing off-grid times are preserved without precision in visible controls', async () => {
  const { EventEditor } = await components();
  const html = render(React.createElement(EventEditor, { initial: { ...initial, startLocal: '2026-11-01T01:17:00.123', endLocal: '2026-11-02T02:30:00.456', endOccurrence: '' }, csrf: 'test', now }));
  assert.equal((html.match(/type="date"/g) || []).length, 2);
  assert.match(html, /1:17 AM \(saved time\)/);
  assert.match(html, /name="startLocal" value="2026-11-01T01:17:00.123"/);
  assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /UTC|GMT|\.123|\.456/);
});
