import { Input } from './ui/input';
import { useEffect, useRef, useState } from 'react';
import { GEOGRAPHIES, STATES, SUBJECTS, LIST_LENGTHS } from '../lib/options';
import { validateProfile } from '../lib/parse';
import type { StudentProfile } from '../lib/types';
export function ProfileEditor({
  draft,
  setDraft,
  onApply,
  hasList,
}: {
  draft: StudentProfile;
  setDraft: (p: StudentProfile) => void;
  onApply: (p: StudentProfile) => void;
  hasList: boolean;
}) {
  const [error, setError] = useState('');
  const errorMessage = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorMessage.current?.focus();
  }, [error]);
  const change = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => {
    setDraft({ ...draft, [key]: value });
    setError('');
  };
  const numeric = (value: string) => (value === '' ? null : Number(value));
  return (
    <form
      className="profile-editor"
      id="student-preferences-form"
      onSubmit={(e) => {
        e.preventDefault();
        const issue = validateProfile(draft);
        setError(issue ?? '');
        if (!issue) onApply(draft);
      }}
    >
      <section className="form-group">
        <div>
          <h2>Student details</h2>
          <p>Check the details from your brief.</p>
        </div>
        <div className="form-fields">
          <div className="field-pair">
            <label>
              Student name <span className="optional">optional</span>
              <Input
                value={draft.name}
                maxLength={80}
                placeholder="Your student"
                onChange={(e) => change('name', e.target.value)}
              />
            </label>
            <label>
              Primary interest
              <select value={draft.subject} onChange={(e) => change('subject', e.target.value)}>
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="score-fields">
            {(['sat', 'act', 'gpa'] as const).map((key) => (
              <label key={key}>
                {key.toUpperCase()}
                <Input
                  type="number"
                  min={key === 'sat' ? 400 : key === 'act' ? 1 : 0}
                  max={key === 'sat' ? 1600 : key === 'act' ? 36 : 5}
                  step={key === 'gpa' ? 0.01 : 1}
                  placeholder="Unknown"
                  value={draft[key] ?? ''}
                  onChange={(e) => change(key, numeric(e.target.value))}
                />
              </label>
            ))}
          </div>
          <p className="field-help">
            Leave missing scores blank. GPA is context, not an admissions prediction.
          </p>
        </div>
      </section>
      <section className="form-group">
        <div>
          <h2>College preferences</h2>
          <p>Set the boundaries for the search.</p>
        </div>
        <div className="form-fields">
          <div className="field-pair">
            <label>
              Home state
              <select value={draft.homeState} onChange={(e) => change('homeState', e.target.value)}>
                <option value="">Not specified</option>
                {Object.entries(STATES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Where to look
              <select
                value={draft.geography}
                onChange={(e) => change('geography', e.target.value as StudentProfile['geography'])}
              >
                {GEOGRAPHIES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="field-pair">
            <label>
              College type
              <select
                value={draft.schoolType}
                onChange={(e) =>
                  change('schoolType', e.target.value as StudentProfile['schoolType'])
                }
              >
                <option value="any">Public & private nonprofit</option>
                <option value="public">Public only</option>
                <option value="private">Private nonprofit only</option>
              </select>
            </label>
            <label>
              Campus size
              <select
                value={draft.size}
                onChange={(e) => change('size', e.target.value as StudentProfile['size'])}
              >
                <option value="any">Any size</option>
                <option value="small">Small · under 5,000</option>
                <option value="medium">Medium · 5,000–15,000</option>
                <option value="large">Large · over 15,000</option>
              </select>
            </label>
          </div>
        </div>
      </section>
      <section className="form-group">
        <div>
          <h2>What matters most</h2>
          <p>Priorities help order the options.</p>
        </div>
        <div className="form-fields">
          <fieldset className="checkbox-group">
            <legend className="sr-only">Priorities</legend>
            {(
              [
                ['needsAid', 'Prioritize affordability'],
                ['handsOn', 'Hands-on learning'],
                ['warmWeather', 'Warmer weather'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="check-label">
                <Input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => change(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label>
            Shortlist length
            <select value={draft.count} onChange={(e) => change('count', Number(e.target.value))}>
              {LIST_LENGTHS.map((count) => (
                <option key={count} value={count}>
                  {count} colleges
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {error && (
        <p role="alert" className="error" ref={errorMessage} tabIndex={-1}>
          {error}
        </p>
      )}
      <div className="form-bottom">
        <p>
          {hasList
            ? 'Updating rebuilds the list and restores removed colleges. Your student note is kept.'
            : 'You can revisit these preferences at any time.'}
        </p>
      </div>
    </form>
  );
}
