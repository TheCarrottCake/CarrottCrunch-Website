import type {ButtonHTMLAttributes,ReactNode} from 'react';
// Same 24px stroked icon vocabulary used by the existing editor toolbar.
export function StudioIcon({name}:{name:string}){
 const paths:Record<string,string>={schedule:'M8 2v4m8-4v4M3 10h18M3 4h18v18H3V4m5 11h3m3 0h3',save:'M4 3h13l4 4v14H3V3h1M7 3v6h10V3M7 21v-8h10v8',edit:'m15 5 4 4M4 20l4-1L20 7l-4-4L4 15v5',add:'M12 4v16M4 12h16',images:'M3 4h18v16H3zM3 16l6-6 5 5 3-3 4 4M16 8h.01',up:'m6 14 6-6 6 6',down:'m6 10 6 6 6-6',remove:'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',preview:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',publish:'m4 12 5 5L20 6',more:'M5 12h.01M12 12h.01M19 12h.01'};
 return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]||paths.more}/></svg>;
}
export function StudioAction({icon,label,compact=false,children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{icon:string;label:string;compact?:boolean;children?:ReactNode}){
 return <button type="button" {...props} className={`button ${className.split(" ").includes("primary")?"primary":"secondary"} studio-action ${compact?'studio-action--icon':''} ${className}`} aria-label={label} title={label}><StudioIcon name={icon}/>{!compact&&<span>{children||label}</span>}</button>;
}
export function StudioActions({label,children}:{label:string;children:ReactNode}){return <div className="studio-compact-actions" role="group" aria-label={label}>{children}</div>;}
