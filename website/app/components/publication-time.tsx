import { useState } from 'react';
import { clockLabel, eventTimeChoices, eventTimeOptions, EVENT_TIMEZONE, formatTorontoDateTime } from '../lib/event-time';

export function PublicationTime() {
 const [date,setDate]=useState(''),[time,setTime]=useState(''),[occurrence,setOccurrence]=useState('');
 let repeated=false,summary='',problem='';
 if(date&&time)try {const choices=eventTimeChoices(`${date}T${time}`,EVENT_TIMEZONE);repeated=choices.length===2;const selected=choices.find(c=>c.occurrence===occurrence);if(selected)summary=`${formatTorontoDateTime(selected.instant)}${repeated?` (${occurrence==='earlier'?'first':'second'} time)`:''} — Toronto time`;}
 catch(error){problem=(error as Error).message;}
 return <fieldset className="event-schedule"><legend>Schedule publication</legend><p className="muted">All times are Toronto time.</p>
 <label htmlFor="publication-date">Publication date</label><input id="publication-date" type="date" name="date" required value={date} onChange={e=>{setDate(e.target.value);setOccurrence('');}} />
 <label htmlFor="publication-time">Publication time</label><select id="publication-time" name="time" required value={time} onChange={e=>{setTime(e.target.value);setOccurrence('');}}><option value="">Choose a time</option>{eventTimeOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
 {repeated?<fieldset><legend>Which {clockLabel(time)}?</legend><p>The clocks go back that night, so this time happens twice.</p>{(['earlier','later'] as const).map((o,i)=><label className="event-occurrence" key={o}><input type="radio" name="occurrence" value={o} required checked={occurrence===o} onChange={()=>setOccurrence(o)} />{i===0?'First':'Second'} {clockLabel(time)}</label>)}</fieldset>:<input type="hidden" name="occurrence" value="" />}
 <div aria-live="polite">{(problem||summary)&&<p className={problem?'studio-field-error':'event-schedule-summary'}>{problem||summary}</p>}</div></fieldset>;
}
