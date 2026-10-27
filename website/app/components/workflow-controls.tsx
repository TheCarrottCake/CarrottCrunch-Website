import type { ReactNode } from 'react';
import type { StaffRole } from '../lib/staff-auth.server';
import type { Workflow } from '../lib/publication-workflow.server';
import { EditorToolbar } from './editor-toolbar';

/** The saved-revision review screen shares the editor toolbar. */
export function WorkflowControls({workflow,csrf,role,kind='announcement',released=false,history}: {
  workflow:Workflow;csrf:string;role:StaffRole;kind?:'announcement'|'event';released?:boolean;history?:ReactNode;
}) {
  return <EditorToolbar workflow={workflow} csrf={csrf} role={role} kind={kind} released={released}
    title="Review & publication" headingId="workflow-title" returnToEditor={false} history={history} />;
}
