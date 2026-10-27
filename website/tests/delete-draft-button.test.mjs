import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

async function harness() {
  const slots = []; let cursor = 0;
  const react = { useId: () => 'delete-test', useEffect() {},
    useRef: value => { const index = cursor++; return slots[index] ??= { current: value }; },
    useState: value => { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], next => { slots[index] = next; }]; },
  };
  const fetcher = { state: 'idle', data: undefined, Form: 'fetcher-form' };
  const imports = { react, 'react/jsx-runtime': jsx, 'react-router': { useFetcher: () => fetcher } };
  const module = { exports: {} };
  const source = await readFile('app/components/delete-draft-button.tsx', 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: key => imports[key] });
  return { render: () => { cursor = 0; return module.exports.DeleteDraftButton({ id: 'test-draft', kind: 'event', revision: 3, title: 'TEST ONLY title', csrf: 'test-only-csrf' }); }, fetcher };
}
function find(root, match) {
  if (!root || typeof root !== 'object') return [];
  if (Array.isArray(root)) return root.flatMap(child => find(child, match));
  return [...(match(root) ? [root] : []), ...find(root.props?.children, match)];
}
const one = (root, match) => { const nodes = find(root, match); assert.equal(nodes.length, 1); return nodes[0]; };

test('delete icon opens a labeled modal with safe initial focus; cancel, Escape and close never submit', async () => {
  const { render } = await harness(); const tree = render();
  const trigger = one(tree, n => n.props?.className === 'draft-delete-trigger');
  const dialog = one(tree, n => n.type === 'dialog');
  const cancel = one(dialog, n => n.type === 'button' && n.props.children === 'Cancel');
  let opens = 0, closes = 0, cancelFocus = 0, restoredFocus = 0;
  dialog.props.ref.current = { open: false, showModal() { this.open = true; opens++; }, close() { this.open = false; closes++; } };
  trigger.props.ref.current = { focus() { restoredFocus++; } }; cancel.props.ref.current = { focus() { cancelFocus++; } };
  assert.equal(trigger.props['aria-label'], 'Delete draft: TEST ONLY title'); assert.equal(trigger.props.type, 'button');
  assert.equal(one(dialog, n => n.type === 'h2').props.children, 'Delete this draft?');
  assert.ok(dialog.props['aria-labelledby']); assert.ok(dialog.props['aria-describedby']);
  trigger.props.onClick(); trigger.props.onClick(); assert.equal(opens, 1); assert.equal(cancelFocus, 1);
  assert.equal(cancel.props.type, 'button'); cancel.props.onClick(); assert.equal(closes, 1);
  let prevented = false; dialog.props.onCancel({ preventDefault() { prevented = true; } }); assert.equal(prevented, false);
  dialog.props.onClose(); assert.equal(restoredFocus, 1);
  let wrapped = 0, preventedTabs = 0;
  const first = { focus() { wrapped++; } }, last = { focus() { wrapped++; } };
  const currentTarget = { ownerDocument: { activeElement: last }, querySelectorAll: () => [first, last] };
  dialog.props.onKeyDown({ key: 'Tab', shiftKey: false, currentTarget, preventDefault() { preventedTabs++; } });
  currentTarget.ownerDocument.activeElement = first;
  dialog.props.onKeyDown({ key: 'Tab', shiftKey: true, currentTarget, preventDefault() { preventedTabs++; } });
  assert.equal(wrapped, 2); assert.equal(preventedTabs, 2);
  assert.equal(one(dialog, n => n.type === 'button' && n.props.type === 'submit').props.disabled, false);
});

test('confirmation posts the guarded revision once and locks stale confirmations', async () => {
  const { render, fetcher } = await harness(); let tree = render();
  const form = one(tree, n => n.type === 'fetcher-form');
  assert.equal(form.props.method, 'post'); assert.equal(form.props.action, '/control/drafts/test-draft/delete');
  for (const [name, value] of [['kind', 'event'], ['revision', 3], ['intent', 'delete'], ['_csrf', 'test-only-csrf']]) assert.equal(one(form, n => n.props?.name === name).props.value, value);
  let prevented = 0; form.props.onSubmit({ preventDefault() { prevented++; } }); form.props.onSubmit({ preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  tree = render(); assert.equal(one(tree, n => n.type === 'button' && n.props.type === 'submit').props.disabled, true);
  one(tree, n => n.type === 'dialog').props.onCancel({ preventDefault() { prevented++; } }); assert.equal(prevented, 2);
  fetcher.data = { status: 409, message: 'TEST ONLY stale draft' }; tree = render();
  assert.equal(one(tree, n => n.type === 'button' && n.props.type === 'submit').props.disabled, true);
  assert.equal(one(tree, n => n.props?.role === 'alert').props.children, 'TEST ONLY stale draft');
});
