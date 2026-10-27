import { EditorToolbar, type EditorToolbarContext } from './editor-toolbar';
import { useState } from 'react';
import { Form, useNavigation } from 'react-router';
import { ContentBody } from './content-body';
import type { EditorValues, EditorErrors } from '../lib/announcement-studio.server';

export function AnnouncementEditor({ initial, csrf, errors = {}, message, conflict = false, toolbar, savedValues }: {
  initial: EditorValues; csrf: string; errors?: EditorErrors; message?: string; conflict?: boolean; toolbar?: EditorToolbarContext; savedValues?: EditorValues;
}) {
  const [values, setValues] = useState(initial);
  const navigation = useNavigation();
  const change = (name: 'title' | 'summary' | 'bodyText', value: string) => setValues(current => ({ ...current, [name]: value }));
  const dirty = !toolbar?.workflow || JSON.stringify(values) !== JSON.stringify(savedValues ?? initial);
  return <>
    <EditorToolbar {...toolbar} key={toolbar?.workflow?.version} title={values.title || (toolbar?.workflow ? "Edit announcement" : "New announcement")} kind="announcement" csrf={csrf} formId="announcement-editor-form" dirty={dirty} conflict={conflict} busy={navigation.state !== "idle"} />
    {message && <div className="studio-message" role="alert" tabIndex={-1}><p>{message}</p>
      {conflict && <p>Open the latest draft in another tab to compare. Copy your changes before reloading this editor; reloading replaces them with the saved version.</p>}
    </div>}
    <div className="studio-editor-grid">
      <Form id="announcement-editor-form" method="post" className="public-card studio-form" aria-label="Announcement draft editor">
        <input type="hidden" name="_csrf" value={csrf} />
        <input type="hidden" name="revision" value={values.revision} />
        <input type="hidden" name="intent" value="save" />
        <h2>Write your announcement</h2>
        {errors.form && <p className="studio-field-error">{errors.form}</p>}
        <label htmlFor="announcement-title">Title</label>
        <input id="announcement-title" name="title" value={values.title} required maxLength={160}
          aria-invalid={!!errors.title} aria-describedby={errors.title ? 'title-error' : undefined} onChange={event => change('title', event.target.value)} />
        {errors.title && <p className="studio-field-error" id="title-error">{errors.title}</p>}
        <label htmlFor="announcement-summary">Summary</label>
        <textarea id="announcement-summary" name="summary" value={values.summary} required maxLength={600} rows={3}
          aria-invalid={!!errors.summary} aria-describedby="summary-help summary-error" onChange={event => change('summary', event.target.value)} />
        <p className="muted" id="summary-help">A short plain-text introduction. Up to 600 characters.</p>
        <p className="studio-field-error" id="summary-error">{errors.summary}</p>
        <label htmlFor="announcement-body">Markdown body</label>
        <textarea id="announcement-body" name="bodyText" value={values.bodyText} required maxLength={40000} rows={18}
          aria-invalid={!!errors.bodyText} aria-describedby="body-help body-error" onChange={event => change('bodyText', event.target.value)} />
        <p className="muted" id="body-help">Supports ## headings, ### subheadings, **bold**, *emphasis*, `code`, - lists and safe links. HTML and embeds stay plain text. Up to 40,000 characters.</p>
        <p className="studio-field-error" id="body-error">{errors.bodyText}</p>
        {errors.revision && <p className="studio-field-error">{errors.revision}</p>}
        <p className="muted">Saving updates the private working copy. Publishing uses only a saved revision.</p>
      </Form>
      <section className="public-card studio-preview" aria-labelledby="preview-heading">
        <span className="micro orange">PRIVATE PREVIEW</span><h2 id="preview-heading">Announcement preview</h2>
        <p className="muted">Uses the same restricted Markdown renderer as public articles.</p>
        <article><h3 className="studio-preview-title">{values.title || 'Your announcement title'}</h3>
          {values.summary && <p className="studio-summary">{values.summary}</p>}
          {values.bodyText ? <ContentBody text={values.bodyText} /> : <p className="muted">Your Markdown preview will appear here.</p>}
        </article>
      </section>
    </div>
  </>;
}
