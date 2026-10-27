import type { ReactNode } from 'react';
import type { StaffRole } from '../lib/staff-auth.server';
import type { Workflow } from '../lib/publication-workflow.server';
import { EditorToolbar, type EditorToolbarContext } from './editor-toolbar';

/** The saved-revision review screen shares the editor toolbar. */
export function WorkflowControls({workflow,csrf,role,kind='announcement',released=false,history,publication,imagePending}: {
  workflow:Workflow;csrf:string;role:StaffRole;kind?:'announcement'|'event';released?:boolean;history?:ReactNode;
  publication?: EditorToolbarContext['publication']; imagePending?: boolean;
}) {
  return <EditorToolbar workflow={workflow} csrf={csrf} role={role} kind={kind} released={released} publication={publication} imagePending={imagePending}
    title="Review & publication" headingId="workflow-title" returnToEditor={false} history={history} />;
}
