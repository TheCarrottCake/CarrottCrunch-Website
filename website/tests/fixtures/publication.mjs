import { changeWorkflow,getWorkflow } from '../../app/lib/publication-workflow.server.ts';

// Explicit approval/publication for fictional test content. Never used by application code.
export async function publishTestContent(db,id,at=Date.now()) {
 const actor={id:'100000000000000088',name:'TEST ONLY publisher',role:'Owner'};
 await db.prepare("INSERT INTO staff_accounts(discord_user_id,role,created_at,updated_at) VALUES(?,'Owner',1,1) ON CONFLICT(discord_user_id) DO NOTHING").bind(actor.id).run();
 await db.prepare("UPDATE content_items SET state='draft',published_at=NULL WHERE id=?").bind(id).run();
 const row=await db.prepare(`SELECT c.*,a.summary,e.starts_at,e.ends_at,e.timezone,e.event_state FROM content_items c LEFT JOIN announcements a ON a.content_id=c.id LEFT JOIN events e ON e.content_id=c.id WHERE c.id=?`).bind(id).first();
 if(row.kind==='announcement'&&!row.summary)row.summary='TEST ONLY summary';
 const r=(await getWorkflow(db,id)).editorial_revision+1;
 await db.prepare('INSERT INTO content_revisions(id,content_id,revision,snapshot_json,actor_id,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,r,JSON.stringify(row),actor.id,at).run();
 for(const intent of ['submit','approve','publish']){const w=await getWorkflow(db,id);await changeWorkflow(db,id,intent,w.editorial_revision,w.version,actor,{},at);}
}
