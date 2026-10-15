import type { StaffRole } from './staff-auth.server';

export type DashboardTool = {
  id: string;
  name: string;
  description: string;
  minimumRole: StaffRole;
};
const tools: readonly DashboardTool[] = [
  { id: 'news', name: 'News & Events', description: 'Announcement and event management.', minimumRole: 'Moderator' },
  { id: 'gallery', name: 'Gallery', description: 'Community gallery moderation.', minimumRole: 'Moderator' },
  { id: 'media', name: 'Media Library', description: 'Media for community content.', minimumRole: 'Moderator' },
  { id: 'profiles', name: 'Staff Profiles', description: 'Staff-profile review and approvals.', minimumRole: 'Administrator' },
  { id: 'homepage', name: 'Homepage Manager', description: 'Homepage content and presentation.', minimumRole: 'Administrator' },
  { id: 'activity', name: 'Activity History', description: 'Moderation activity history.', minimumRole: 'Moderator' },
  { id: 'settings', name: 'Settings', description: 'Site settings.', minimumRole: 'Administrator' },
];
const rank: Record<StaffRole, number> = { Moderator: 1, Administrator: 2, Owner: 3 };
/** Presentation only. Future loaders/actions must independently authorize on the server. */
export function dashboardTools(role: StaffRole): DashboardTool[] {
  if (!Object.hasOwn(rank, role)) return [];
  return tools.filter(tool => rank[role] >= rank[tool.minimumRole]).map(tool => ({
    ...tool,
    description: tool.id === 'settings' && role === 'Owner'
      ? 'Site settings, role assignments and restricted configuration.' : tool.description,
  }));
}
