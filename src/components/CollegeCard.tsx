import {
  ArrowUpRight,
  Check,
  CircleDollarSign,
  GraduationCap,
  MapPin,
  University,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';
import { CampusPhoto } from './CampusPhoto';
import { money, percent } from '../lib/options';
import type { Recommendation } from '../lib/types';
export function CollegeCard({
  item,
  index,
  included,
  onToggle,
}: {
  item: Recommendation;
  index: number;
  included: boolean;
  onToggle: () => void;
}) {
  const c = item.college;
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  return (
    <motion.article
      className={`college-card ${included ? '' : 'excluded'}`}
      aria-label={c.name}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('a, button, input, label, details')) return;
        if (window.getSelection()?.isCollapsed === false) return;
        setExpanded((open) => !open);
      }}
      initial={reducedMotion ? false : { opacity: 0.65, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <CampusPhoto college={c} />
      <label
        className={`card-inclusion ${included ? 'is-included' : ''}`}
        title={included ? 'Remove from handout' : 'Add to handout'}
      >
        <input
          type="checkbox"
          checked={included}
          onChange={onToggle}
          aria-label={`Include ${c.name} in student handout`}
        />
        <Check size={14} aria-hidden="true" />
      </label>
      <div className="college-card-content">
        <div className="college-heading">
          <span className="school-number" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="college-title">
            <h3>
              <button
                type="button"
                className="college-title-button"
                aria-expanded={expanded}
                aria-controls={detailsId}
                onClick={() => setExpanded((open) => !open)}
              >
                {c.name}
              </button>
            </h3>
            <p className="location">
              <MapPin size={13} />
              {c.city}, {c.state}
              <span>·</span>
              {c.control} · {c.size.toLocaleString()} undergraduates
            </p>
          </div>
          <div className="college-selection">
            <span className={`band band-${item.band.toLowerCase().replace(' ', '-')}`}>
              {item.band}
            </span>
          </div>
        </div>
        <div className="college-body">
          <dl className="school-stats">
            <div>
              <CircleDollarSign size={17} aria-hidden="true" />
              <dt>Average annual net price</dt>
              <dd>{money(c.netPrice)}</dd>
            </div>
            <div>
              <University size={17} aria-hidden="true" />
              <dt>Overall admission rate</dt>
              <dd>{percent(c.admissionRate)}</dd>
            </div>
            <div>
              <GraduationCap size={17} aria-hidden="true" />
              <dt>Average SAT of submitters</dt>
              <dd>{c.satAverage ?? 'Not reported'}</dd>
            </div>
          </dl>
        </div>
        <details
          id={detailsId}
          className="school-details"
          open={expanded}
          onToggle={(event) => setExpanded(event.currentTarget.open)}
        >
          <summary>Why this school & what to check</summary>
          <p>Institution-wide averages. Net price is not a personal cost estimate.</p>
          <ul>
            {item.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="academic-context">
            <strong>Academic comparison: </strong>
            {item.academicContext}
          </p>
          <ul>
            {item.considerations.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="tiny muted">
            Published institutional averages, not a prediction or price quote. Scorecard June 2026
            release; reporting years vary.
          </p>
          <div className="source-links">
            {item.evidence.map((e) => (
              <a href={e.url} target="_blank" rel="noreferrer" key={e.url}>
                {e.label}
                <ArrowUpRight size={13} />
              </a>
            ))}
            {c.calculator && (
              <a href={c.calculator} target="_blank" rel="noreferrer">
                Net price calculator
                <ArrowUpRight size={13} />
              </a>
            )}
            {c.website && (
              <a href={c.website} target="_blank" rel="noreferrer">
                College website
                <ArrowUpRight size={13} />
              </a>
            )}
          </div>
        </details>
      </div>
    </motion.article>
  );
}
