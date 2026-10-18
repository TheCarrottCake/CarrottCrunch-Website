import { useState } from 'react';
import { Form, Link, useNavigation } from 'react-router';
import type { EventValues, EventErrors } from '../lib/event-studio.server';
import { eventTimeChoices, resolveEventTime, EVENT_TIMEZONE, eventTimeOptions, clockLabel, eventScheduleSummary } from '../lib/event-time';
import { eventStatus } from '../lib/event-display';
import { ContentBody } from './content-body';

function Schedule({ values, errors, change }: { values: EventValues; errors: EventErrors; change: (name: keyof EventValues, value: string) => void }) {
  const date = values.startLocal.split('T')[0];
  const endDate = values.endLocal.split('T')[0];
  const [differentEndDate, setDifferentEndDate] = useState(!!values.endLocal && endDate !== date);
  const changeDate = (next: string) => {
    change('startLocal', `${next}T${values.startLocal.split('T')[1]?.slice(0, 5) || ''}`);
    if (!differentEndDate) change('endLocal', `${next}T${values.endLocal.split('T')[1]?.slice(0, 5) || ''}`);
  };
  return <fieldset className="event-schedule">
    <legend>When is your event?</legend>
    <p className="muted">All times are Toronto time.</p>
    <label htmlFor="event-date">Event date</label>
    <input id="event-date" name="eventDate" type="date" required value={date} aria-describedby="startLocal-error" aria-invalid={!!errors.startLocal} onChange={event => changeDate(event.target.value)} />
    <div className="event-clock-grid">{(['startLocal', 'endLocal'] as const).map((field, index) => {
      const time = values[field].split('T')[1]?.slice(0, 5) || '';
      const occurrence = index === 0 ? 'startOccurrence' : 'endOccurrence';
      let repeated = false, problem = '';
      if (values[field] && time) {
        try { repeated = eventTimeChoices(values[field], EVENT_TIMEZONE).length === 2; }
        catch (error) { problem = (error as Error).message; }
      }
      const savedOption = time && !eventTimeOptions.some(option => option.value === time);
      return <div className="event-clock" key={field}>
        <label htmlFor={`event-${field}`}>{index === 0 ? 'Start Time' : 'End Time'}</label>
        <select id={`event-${field}`} name={index === 0 ? 'startTime' : 'endTime'} required value={time}
          aria-invalid={!!errors[field] || !!problem} aria-describedby={`${field}-error`}
          onChange={event => change(field, `${(index === 0 || !differentEndDate ? date : endDate)}T${event.target.value}`)}>
          <option value="">Choose a time</option>
          {savedOption && <option value={time}>{clockLabel(time)} (saved time)</option>}
          {eventTimeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input type="hidden" name={field} value={values[field]} />
        <p className="studio-field-error" id={`${field}-error`}>{errors[field] || problem}</p>
        {repeated ? <fieldset className="event-occurrences" aria-describedby={`${occurrence}-help ${occurrence}-error`}>
          <legend>Which {clockLabel(time)}?</legend>
          <p className="muted" id={`${occurrence}-help`}>The clocks go back that night, so this time happens twice.</p>
          {(['earlier', 'later'] as const).map((choice, choiceIndex) => <label className="event-occurrence" key={choice}>
            <input type="radio" name={occurrence} value={choice} required checked={values[occurrence] === choice}
              aria-invalid={!!errors[occurrence] || !!errors[field]} onChange={() => change(occurrence, choice)} />
            <span>{choiceIndex === 0 ? 'First' : 'Second'} {clockLabel(time)}</span>
          </label>)}
        </fieldset> : <input type="hidden" name={occurrence} value={values[occurrence]} />}
        <p className="studio-field-error" id={`${occurrence}-error`}>{errors[occurrence]}</p>
      </div>;
    })}</div>
    <label className="event-end-date-toggle"><input type="checkbox" name="differentEndDate" value="1" checked={differentEndDate} onChange={event => {
      setDifferentEndDate(event.target.checked);
      if (!event.target.checked) change('endLocal', `${date}T${values.endLocal.split('T')[1]?.slice(0, 5) || ''}`);
    }} />Ends on another day</label>
    {differentEndDate ? <><label htmlFor="event-end-date">End date</label><input id="event-end-date" name="endDate" type="date" required value={endDate} aria-describedby="endLocal-error" onChange={event => change('endLocal', `${event.target.value}T${values.endLocal.split('T')[1]?.slice(0, 5) || ''}`)} /></> : <input type="hidden" name="endDate" value="" />}
    {errors.timezone && <p className="studio-field-error">{errors.timezone}</p>}
  </fieldset>;
}

export function EventEditor({ initial, csrf, now, errors = {}, message, conflict = false, eventState = 'active' }: {
  initial: EventValues; csrf: string; now: number; errors?: EventErrors; message?: string; conflict?: boolean; eventState?: 'active' | 'cancelled';
}) {
  const [values, setValues] = useState(initial);
  const navigation = useNavigation();
  const change = (name: keyof EventValues, value: string) => setValues(current => ({ ...current, [name]: value,
    ...(name === 'startLocal' ? { startOccurrence: '' } : {}), ...(name === 'endLocal' ? { endOccurrence: '' } : {}),
  }));
  let timing: { starts_at: number; ends_at: number } | undefined, timingError = '';
  try {
    const starts_at = resolveEventTime(values.startLocal, EVENT_TIMEZONE, values.startOccurrence);
    const ends_at = resolveEventTime(values.endLocal, EVENT_TIMEZONE, values.endOccurrence);
    if (ends_at <= starts_at) throw new Error('Please choose an end time after the start time.');
    timing = { starts_at, ends_at };
  } catch (error) { timingError = (error as Error).message; }
  const summary = timing ? eventScheduleSummary(timing.starts_at, timing.ends_at) : '';
  return <>
    {message && <div className="studio-message" role="alert" tabIndex={-1}><p>{message}</p>
      {conflict && <p>Open the latest draft in another tab to compare. Copy your changes before reloading; reloading replaces them with the saved version.</p>}
    </div>}
    <div className="studio-editor-grid">
      <Form method="post" className="public-card studio-form" aria-label="Community event draft editor">
        <input type="hidden" name="_csrf" value={csrf} /><input type="hidden" name="revision" value={values.revision} /><input type="hidden" name="intent" value="save" />
        <h2>Write your event</h2>
        {errors.form && <p className="studio-field-error">{errors.form}</p>}
        <label htmlFor="event-title">Title</label>
        <input id="event-title" name="title" required maxLength={160} value={values.title} aria-invalid={!!errors.title} aria-describedby="event-title-error" onChange={event => change('title', event.target.value)} />
        <p className="studio-field-error" id="event-title-error">{errors.title}</p>
        <label htmlFor="event-body">Description / Markdown body</label>
        <textarea id="event-body" name="bodyText" required maxLength={40000} rows={12} value={values.bodyText} aria-invalid={!!errors.bodyText} aria-describedby="event-body-help event-body-error" onChange={event => change('bodyText', event.target.value)} />
        <p className="muted" id="event-body-help">Supports headings, emphasis, code, lists and safe links. HTML and embeds stay plain text.</p>
        <p className="studio-field-error" id="event-body-error">{errors.bodyText}</p>
        <Schedule {...{ values, errors, change }} />
        <p className={summary ? 'event-schedule-summary' : 'studio-field-error'} aria-live="polite">{summary || timingError}</p>
        {errors.revision && <p className="studio-field-error">{errors.revision}</p>}
        <div className="studio-actions"><button className="button primary" disabled={navigation.state !== 'idle' || conflict}>{navigation.state === 'submitting' ? 'Saving draft…' : 'Save draft'}</button><Link className="text-link" to="/control/news?kind=event">All event drafts</Link></div>
        <p className="muted">Saved events remain private drafts. Publishing is not available.</p>
      </Form>
      <section className="public-card studio-preview" aria-labelledby="event-preview-heading">
        <span className="micro orange">PRIVATE DRAFT PREVIEW</span><h2 id="event-preview-heading">Event preview</h2>
        <article>
          {timing && <span className="micro orange">{eventStatus({ ...timing, timezone: EVENT_TIMEZONE, event_state: eventState }, now)}</span>}
          <h3 className="studio-preview-title">{values.title || 'Your event title'}</h3>
          <p className={summary ? 'event-time' : 'studio-field-error'}>{summary || timingError}</p>
          <ContentBody text={values.bodyText} />
        </article>
      </section>
    </div>
  </>;
}
