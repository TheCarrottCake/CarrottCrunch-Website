import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import { dashboardTools } from '../app/lib/dashboard-tools.ts';

// Exercise component events with existing TypeScript/React tooling; no browser shim/dependency.
async function harness(file, name, props = {}) {
  const slots = []; let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect() {},
  };
  const imports = {
    react, 'react/jsx-runtime': jsxRuntime,
    'react-router': { Link: 'router-link', NavLink: 'router-nav-link', Form: 'router-form' },
    './community': { Brand: 'brand' }, '../lib/dashboard-tools': { dashboardTools },
  };
  const module = { exports: {} };
  const source = await readFile(file, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: key => {
    if (!(key in imports)) throw new Error(`Unexpected UI test import: ${key}`);
    return imports[key];
  } }, { filename: file });
  return () => { cursor = 0; return module.exports[name](props); };
}
function nodes(root, match) {
  if (!root || typeof root !== 'object') return [];
  if (Array.isArray(root)) return root.flatMap(child => nodes(child, match));
  return [...(match(root) ? [root] : []), ...nodes(root.props?.children, match)];
}
const one = (root, match) => { const found = nodes(root, match); assert.equal(found.length, 1); return found[0]; };

test('public desktop/mobile header links preserve Discord joining and close the mobile menu', async () => {
  const render = await harness('app/components/community.tsx', 'Header');
  let tree = render();
  const toggle = () => one(tree, node => node.props?.['aria-controls'] === 'main-nav');
  assert.equal(toggle().props['aria-expanded'], false);
  const staff = one(tree, node => node.props?.to === '/control');
  assert.equal(staff.props.children, 'Staff Sign In');
  assert.match(staff.props.className, /secondary/);
  assert.match(one(tree, node => node.props?.to === '/join').props.className, /primary/);
  toggle().props.onClick(); tree = render();
  assert.equal(toggle().props['aria-expanded'], true);
  assert.match(one(tree, node => node.props?.id === 'main-nav').props.className, /open/);
  one(tree, node => node.props?.to === '/control').props.onClick(); tree = render();
  assert.equal(toggle().props['aria-expanded'], false);
  toggle().props.onClick(); tree = render();
  let focused = false;
  toggle().props.ref.current = { focus() { focused = true; } };
  one(tree, node => node.type === 'header').props.onKeyDown({ key: 'Escape' }); tree = render();
  assert.equal(toggle().props['aria-expanded'], false);
  assert.equal(focused, true);
});

test('dashboard role navigation, mobile toggle/Escape, and CSRF logout remain intact', async () => {
  for (const role of ['Moderator', 'Administrator', 'Owner']) {
    const render = await harness('app/components/control-dashboard.tsx', 'ControlDashboard', {
      identity: { username: 'fictional_staff', displayName: 'Fictional Staff' }, role, csrf: 'fictional-csrf-test-value',
    });
    let tree = render();
    const nav = () => one(tree, node => node.props?.id === 'control-nav');
    const toggle = () => one(tree, node => node.props?.['aria-controls'] === 'control-nav');
    const unavailable = nodes(nav(), node => node.props?.['aria-disabled'] === 'true');
    assert.equal(unavailable.length, dashboardTools(role).length);
    for (const item of unavailable) {
      assert.equal(item.props.href, undefined); assert.equal(item.props.to, undefined);
      assert.equal(item.props.children[1].props.children, 'Unavailable');
    }
    const links = nodes(nav(), node => node.props?.to);
    assert.deepEqual(links.map(node => node.props.to), ['/control']);
    assert.equal(one(tree, node => node.type === 'main').props.id, 'control-main');
    assert.equal(one(tree, node => node.props?.to === '/').props.children, '← Public website');
    const form = one(tree, node => node.props?.action === '/control/logout');
    assert.equal(form.props.method, 'post'); assert.equal(form.props.reloadDocument, true);
    assert.equal(one(form, node => node.props?.name === '_csrf').props.value, 'fictional-csrf-test-value');
    assert.equal(toggle().props['aria-expanded'], false);
    toggle().props.onClick(); tree = render();
    assert.equal(toggle().props['aria-expanded'], true); assert.match(nav().props.className, /is-open/);
    links[0].props.onClick(); tree = render(); assert.equal(toggle().props['aria-expanded'], false);
    toggle().props.onClick(); tree = render(); let focused = false;
    toggle().props.ref.current = { focus() { focused = true; } };
    one(tree, node => node.type === 'aside').props.onKeyDown({ key: 'Escape' }); tree = render();
    assert.equal(toggle().props['aria-expanded'], false); assert.equal(focused, true);
  }
});
