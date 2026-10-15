import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dashboardTools } from '../app/lib/dashboard-tools.ts';

test('dashboard tools follow the specified role hierarchy', () => {
  assert.deepEqual(dashboardTools('Moderator').map(tool => tool.name), ['News & Events', 'Gallery', 'Media Library', 'Activity History']);
  const admin = dashboardTools('Administrator');
  assert.deepEqual(admin.map(tool => tool.name), ['News & Events', 'Gallery', 'Media Library', 'Staff Profiles', 'Homepage Manager', 'Activity History', 'Settings']);
  assert.equal(dashboardTools('Owner').length, 7);
  assert.match(dashboardTools('Owner').find(tool => tool.id === 'settings').description, /role assignments and restricted configuration/);
  assert.doesNotMatch(admin.find(tool => tool.id === 'settings').description, /role assignments|restricted configuration/);
  assert.deepEqual(dashboardTools('unknown'), []);
});
