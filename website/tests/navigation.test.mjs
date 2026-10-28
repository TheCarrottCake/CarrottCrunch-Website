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
    './community': { Brand: 'brand' }, './account-menu': { AccountMenu: 'account-menu' }, '../lib/dashboard-tools': { dashboardTools },
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
  const staff = one(tree, node => node.props?.to === '/login');
  assert.equal(staff.props.children, 'Sign In');
  assert.match(staff.props.className, /secondary/);
  assert.match(one(tree, node => node.props?.to === '/join').props.className, /primary/);
  toggle().props.onClick(); tree = render();
  assert.equal(toggle().props['aria-expanded'], true);
  assert.match(one(tree, node => node.props?.id === 'main-nav').props.className, /open/);
  one(tree, node => node.props?.to === '/login').props.onClick(); tree = render();
  assert.equal(toggle().props['aria-expanded'], false);
  toggle().props.onClick(); tree = render();
  let focused = false;
  toggle().props.ref.current = { focus() { focused = true; } };
  one(tree, node => node.type === 'header').props.onKeyDown({ key: 'Escape' }); tree = render();
  assert.equal(toggle().props['aria-expanded'], false);
  assert.equal(focused, true);
  toggle().props.onClick(); tree = render();
  const header = () => one(tree, node => node.type === 'header');
  header().props.onBlurCapture({relatedTarget:{},currentTarget:{contains:()=>true}});tree=render();
  assert.equal(toggle().props['aria-expanded'],true,'Focus within navigation must keep it open');
  header().props.onBlurCapture({relatedTarget:{},currentTarget:{contains:()=>false}});tree=render();
  assert.equal(toggle().props['aria-expanded'],false,'Tabbing into page content must dismiss the overlay');
});

test('dashboard role navigation, mobile toggle/Escape, and CSRF logout remain intact', async () => {
  for (const role of ['Moderator', 'Administrator', 'Owner']) {
    const render = await harness('app/components/control-dashboard.tsx', 'ControlDashboard', {
      identity: { username: 'fictional_staff', displayName: 'Fictional Staff' }, role, csrf: 'fictional-csrf-test-value', section: 'Overview',
    });
    let tree = render();
    const nav = () => one(tree, node => node.props?.id === 'control-nav');
    const toggle = () => one(tree, node => node.props?.['aria-controls'] === 'control-nav');
    const unavailable = nodes(nav(), node => node.props?.['aria-disabled'] === 'true');
    assert.equal(unavailable.length, dashboardTools(role).filter(tool => !tool.href).length);
    for (const item of unavailable) {
      assert.equal(item.props.href, undefined); assert.equal(item.props.to, undefined);
      assert.equal(item.props.children[1].props.children, 'Unavailable');
    }
    const links = nodes(nav(), node => node.props?.to);
    assert.deepEqual(links.map(node => node.props.to), ['/control', '/control/posts', '/control/collections/gallery', '/control/collections/about-memories', '/control/media', '/control/collections/homepage']);
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

test('dashboard welcome belongs to the explicit Overview section, independent of children', async () => {
  const identity = { username: 'fictional_staff', displayName: 'Fictional Staff' };
  const props = { identity, role: 'Owner', csrf: 'fictional-csrf' };
  for (const children of [undefined, jsxRuntime.jsx('div', { children: 'Overview content' })]) {
    const render = await harness('app/components/control-dashboard.tsx', 'ControlDashboard', { ...props, section: 'Overview', children });
    const welcome = one(render(), node => node.props?.className === 'dashboard-welcome');
    assert.equal(one(welcome, node => node.type === 'h1').props.children[1].props.children, identity.displayName);
    assert.equal(one(welcome, node => node.props?.className === 'dashboard-account').props.children[0].props.children, identity.username);
    assert.equal(one(welcome, node => node.props?.className === 'dashboard-role').props.children, 'Owner');
    assert.equal(nodes(welcome, node => node.type === 'p').length, 2);
  }
  for (const [section, title] of [['Media Library', 'Media Library'], ['Media Library', 'Illustrative image'], ['News & Events', 'News & Events Studio'], ['News & Events', 'New announcement draft'], ['News & Events', 'Edit announcement draft']]) {
    const children = jsxRuntime.jsx('section', { children: jsxRuntime.jsx('h1', { children: title }) });
    const render = await harness('app/components/control-dashboard.tsx', 'ControlDashboard', { ...props, section, children });
    const main = one(render(), node => node.type === 'main');
    assert.equal(nodes(main, node => node.props?.className === 'dashboard-welcome' || node.props?.className === 'dashboard-account' || node.props?.className === 'dashboard-role').length, 0);
    const label = one(main, node => node.props?.className === 'dashboard-section-header');
    assert.equal(label.props.children.props.children[1], section);
    assert.equal(one(main, node => node.type === 'h1').props.children, title);
  }
  const emptyTool = await harness('app/components/control-dashboard.tsx', 'ControlDashboard', { ...props, section: 'Media Library' });
  assert.equal(nodes(emptyTool(), node => node.props?.className === 'dashboard-welcome' || node.props?.className === 'dashboard-notice').length, 0);
});

test('member/staff account disclosure supports keyboard, avatar fallback and secure logout', async () => {
  for (const staff of [false, true]) {
    const render = await harness('app/components/account-menu.tsx', 'AccountMenu', {
      account: { username: 'fictional_member', displayName: 'Fictional Member', avatarUrl: 'https://cdn.discordapp.com/avatars/100000000000000001/' + 'a'.repeat(32) + '.png', canAccessControl: staff, csrf: 'fictional-csrf' },
      onNavigate() {},
    });
    let tree = render();
    const toggle = () => one(tree, node => node.props?.['aria-controls'] === 'site-account-menu');
    assert.equal(toggle().props['aria-expanded'], false);
    assert.match(toggle().props['aria-label'], /Fictional Member/);
    const img = one(tree, node => node.type === 'img');
    assert.equal(img.props.alt, ''); img.props.onError(); tree = render();
    assert.equal(nodes(tree, node => node.type === 'img').length, 0);
    toggle().props.onKeyDown({ key: 'ArrowDown', preventDefault() {} }); tree = render();
    assert.equal(toggle().props['aria-expanded'], true);
    assert.equal(one(tree, node => node.props?.id === 'site-account-menu').props.hidden, false);
    assert.equal(nodes(tree, node => node.props?.to === '/control').length, staff ? 1 : 0);
    assert.equal(one(tree, node => node.props?.action === '/logout').props.method, 'post');
    assert.equal(one(tree, node => node.props?.name === '_csrf').props.value, 'fictional-csrf');
    let focused = false; toggle().props.ref.current = { focus() { focused = true; } };
    tree.props.onKeyDown({ key: 'Escape', stopPropagation() {} }); tree = render();
    assert.equal(toggle().props['aria-expanded'], false); assert.equal(focused, true);
    toggle().props.onClick(); tree = render();
    one(tree, node => node.props?.to === '/account').props.onClick(); tree = render();
    assert.equal(toggle().props['aria-expanded'], false);
  }
});
