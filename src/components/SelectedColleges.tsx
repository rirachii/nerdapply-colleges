import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { Recommendation } from '../lib/types';

export function SelectedColleges({
  items,
  onRemove,
}: {
  items: Recommendation[];
  onRemove: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(() =>
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 1300px)').matches
      : true,
  );
  return (
    <aside className="selected-colleges" aria-label="Selected colleges">
      <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>
          <span>
            Selected colleges <span className="selection-count">{items.length}</span>
          </span>
          <ChevronDown size={16} />
        </summary>
        <p className="selection-caption">In your student’s PDF</p>
        {items.length ? (
          <ol>
            {items.map(({ college }, index) => (
              <li key={college.id}>
                <span className="selection-number">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{college.name}</strong>
                  <span>
                    {college.city}, {college.state}
                  </span>
                </div>
                <button
                  className="icon-button"
                  onClick={() => onRemove(college.id)}
                  aria-label={`Remove ${college.name} from selected colleges`}
                  title="Remove from handout"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="selection-empty">Include a college to start your student’s handout.</p>
        )}
      </details>
    </aside>
  );
}
