import { useState } from 'react';
import { Check, ChevronDown, Pencil } from 'lucide-react';
import { GEOGRAPHIES, STATES } from '../lib/options';
import type { StudentProfile } from '../lib/types';

/** Read-only applied preferences; editing uses the existing review/validation flow. */
export function PreferenceSummary({
  profile,
  onEdit,
  notices = [],
}: {
  profile: StudentProfile;
  onEdit: () => void;
  notices?: string[];
}) {
  const [expanded, setExpanded] = useState(() =>
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 721px)').matches
      : true,
  );
  const priorities = [
    profile.needsAid && 'Financial aid matters',
    profile.handsOn && 'Hands-on learning',
    profile.warmWeather && 'Warmer weather',
  ].filter(Boolean);
  return (
    <aside className="preference-summary" aria-label="Student preferences">
      <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>
          Your preferences <ChevronDown size={16} />
        </summary>
        <div className="preference-summary-content">
          <dl className="summary-scores">
            <div>
              <dt>SAT</dt>
              <dd>{profile.sat ?? '—'}</dd>
            </div>
            <div>
              <dt>ACT</dt>
              <dd>{profile.act ?? '—'}</dd>
            </div>
            <div>
              <dt>GPA</dt>
              <dd>{profile.gpa ?? '—'}</dd>
            </div>
          </dl>
          <dl className="summary-preferences">
            <div>
              <dt>Home state</dt>
              <dd>{STATES[profile.homeState] || 'Not specified'}</dd>
              {notices.some((notice) => notice.includes('residence is unconfirmed')) && (
                <p className="summary-hint">Inferred from your brief — please confirm.</p>
              )}
            </div>
            <div>
              <dt>Where to look</dt>
              <dd>{GEOGRAPHIES.find(([id]) => id === profile.geography)?.[1]}</dd>
            </div>
            <div>
              <dt>College type</dt>
              <dd>
                {
                  {
                    any: 'Public & private nonprofit',
                    public: 'Public only',
                    private: 'Private nonprofit only',
                  }[profile.schoolType]
                }
              </dd>
            </div>
            <div>
              <dt>Campus size preference</dt>
              <dd>
                {
                  {
                    any: 'Any size',
                    small: 'Small · under 5,000',
                    medium: 'Medium · 5,000–15,000',
                    large: 'Large · over 15,000',
                  }[profile.size]
                }
              </dd>
            </div>
            <div>
              <dt>Starting list</dt>
              <dd>{profile.count} colleges</dd>
            </div>
          </dl>
          {priorities.length > 0 && (
            <div className="summary-priorities">
              <h3>What matters</h3>
              <ul>
                {priorities.map((priority) => (
                  <li key={String(priority)}>
                    <Check size={14} />
                    {priority}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
      <button className="text-button summary-edit" onClick={onEdit}>
        <Pencil size={14} />
        Edit preferences
      </button>
    </aside>
  );
}
