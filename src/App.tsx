import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WorkspaceShell, type Stage } from './components/WorkspaceShell';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/input';
import { StatefulButton } from './components/ui/stateful-button';
import { ArrowLeft, ArrowRight, Check, ChevronDown, RotateCcw, Search, X } from 'lucide-react';
import { CampusPhotoCredits } from './components/CampusPhoto';
import { CollegeCard } from './components/CollegeCard';
import { CollegeListEnd } from './components/CollegeListEnd';
import { PreferenceSummary } from './components/PreferenceSummary';
import { SelectedColleges } from './components/SelectedColleges';
import { ProfileEditor } from './components/ProfileEditor';
import { Walkthrough } from './components/Walkthrough';
import { HandoutPreview } from './components/HandoutPreview';
import { EXAMPLES, STATES, subjectLabel } from './lib/options';
import { studentSummary } from './lib/student-summary';
import { MAX_PROMPT_LENGTH, parseStudent, validateProfile, validatePrompt } from './lib/parse';
import { BAND_DESCRIPTIONS, recommend } from './lib/recommend';
import type { Band, RecommendationResult, StudentProfile } from './lib/types';

export default function App() {
  const [guide, setGuide] = useState(location.hash.startsWith('#guide'));
  const [stage, setStage] = useState<Stage>('brief');
  const [prompt, setPrompt] = useState('');
  const [parsedPrompt, setParsedPrompt] = useState('');
  const [appliedPrompt, setAppliedPrompt] = useState('');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [draft, setDraft] = useState<StudentProfile | null>(null);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [filter, setFilter] = useState<Exclude<Band, 'Not enough data'> | 'All'>('All');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = JSON.stringify(profile) !== JSON.stringify(draft) || prompt !== appliedPrompt;
  const items = useMemo(
    () => result?.items.filter((r) => !excluded.includes(r.college.id)) ?? [],
    [result, excluded],
  );
  const [collegeQuery, setCollegeQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const discovery = useMemo(() => {
    if (!profile || !result || dirty || validateProfile(profile)) return [];
    const initial = recommend(profile).items;
    const all = recommend(profile, undefined, true).items;
    return [
      ...initial,
      ...all.filter((item) => !initial.some((r) => r.college.id === item.college.id)),
    ];
  }, [profile, result, dirty]);
  const normalizedQuery = collegeQuery.trim().toLowerCase();
  const searchedState = Object.entries(STATES).find(
    ([code, name]) =>
      code.toLowerCase() === normalizedQuery || name.toLowerCase() === normalizedQuery,
  )?.[0];
  const matchingColleges = discovery.filter(
    (item) =>
      (filter === 'All' || item.band === filter) &&
      (searchedState
        ? item.college.state === searchedState
        : `${item.college.name} ${item.college.city} ${STATES[item.college.state]}`
            .toLowerCase()
            .includes(normalizedQuery)),
  );
  const showMore = useCallback(() => setVisibleCount((count) => count + 10), []);
  const available: Stage[] = [
    'brief',
    ...(draft && prompt === parsedPrompt ? ['preferences' as const] : []),
    ...(result && !dirty
      ? ['colleges' as const, ...(items.length ? ['handout' as const] : [])]
      : []),
  ];
  useEffect(() => {
    const field = textarea.current;
    if (!field) return;
    const resize = () => {
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [prompt, stage, guide]);
  useEffect(() => {
    const change = () => setGuide(location.hash.startsWith('#guide'));
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus();
    if (stage === 'colleges') setFilter('All');
  }, [stage, guide]);
  useEffect(() => {
    if (!status || pdfBusy) return;
    const timer = setTimeout(() => setStatus(''), 6500);
    return () => clearTimeout(timer);
  }, [status, pdfBusy]);
  const navigate = (next: Stage) => {
    if (available.includes(next)) {
      setStage(next);
      setError('');
    }
  };
  const interpret = () => {
    const issue = validatePrompt(prompt);
    if (issue) {
      setError(issue);
      textarea.current?.focus();
      return;
    }
    const parsed = parsedPrompt !== prompt || !draft ? parseStudent(prompt) : null;
    const next = parsed?.profile ?? draft!;
    if (parsed) {
      setNotices(parsed.notices);
      setParsedPrompt(prompt);
    }
    const profileIssue = validateProfile(next);
    if (dirty || !result) {
      setResult(
        profileIssue ? { items: [], eligibleCount: 0, notices: [profileIssue] } : recommend(next),
      );
      setExcluded([]);
      setFilter('All');
      setCollegeQuery('');
      setVisibleCount(next.count);
    }
    setProfile(next);
    setDraft(next);
    setAppliedPrompt(prompt);
    setError('');
    setStage('colleges');
  };
  const apply = (next: StudentProfile) => {
    if (dirty || !result) {
      setResult(recommend(next));
      setExcluded([]);
      setFilter('All');
      setCollegeQuery('');
      setVisibleCount(next.count);
    }
    setNotices((current) =>
      current.filter((notice) => !notice.includes('residence is unconfirmed')),
    );
    setProfile(next);
    setDraft(next);
    setAppliedPrompt(prompt);
    setError('');
    setStage('colleges');
  };
  const download = async () => {
    if (!profile || !items.length || dirty || pdfBusy) return;
    setPdfBusy(true);
    setError('');
    setStatus('');
    try {
      const { downloadStudentPdf } = await import('./lib/download');
      await downloadStudentPdf(profile, items, note);
      setStatus('PDF downloaded. Review the file before sharing it with your student.');
    } catch {
      setError(
        'The PDF could not be created. Your shortlist is still here. Please try downloading again.',
      );
    } finally {
      setPdfBusy(false);
    }
  };
  const startNew = () => {
    if (
      (prompt || profile || note) &&
      !window.confirm(
        'Start a new student? This clears the current brief, shortlist, and note. Download the handout first if you want to keep it.',
      )
    )
      return;
    location.hash = '';
    setPrompt('');
    setParsedPrompt('');
    setAppliedPrompt('');
    setProfile(null);
    setDraft(null);
    setResult(null);
    setExcluded([]);
    setNote('');
    setNotices([]);
    setError('');
    setStatus('');
    setStage('brief');
  };
  return (
    <>
      <a className="skip-link" href={guide ? '#guide-main' : '#main'}>
        Skip to content
      </a>
      <WorkspaceShell
        guide={guide}
        stage={stage}
        available={available}
        onNavigate={navigate}
        onNew={startNew}
        hasWork={!!(prompt || profile || note)}
        headerTitle={
          stage === 'colleges' && profile && !guide ? (
            <div className="header-student">
              <h1 ref={heading} tabIndex={-1}>
                {profile.name ? `${profile.name}’s college shortlist` : 'Your college shortlist'}
              </h1>
              <p title={studentSummary(profile)}>{studentSummary(profile)}</p>
            </div>
          ) : stage === 'handout' && profile && !guide ? (
            <div className="header-student header-handout">
              <h1 ref={heading} tabIndex={-1}>
                Prepare the student handout
              </h1>
              <p>
                Add a note for {profile.name ? profile.name.split(' ')[0] : 'your student'}, then
                preview and download the PDF.
              </p>
            </div>
          ) : undefined
        }
        headerExtra={
          stage === 'brief' ? (
            <div className="sample-menu">
              <button className="text-button" popoverTarget="sample-menu">
                Try a sample <ChevronDown size={13} />
              </button>
              <div id="sample-menu" className="sample-popover" popover="auto">
                <h2>Start with a sample</h2>
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={(e) => {
                      setPrompt(ex.text);
                      setError('');
                      e.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover?.();
                      textarea.current?.focus();
                    }}
                  >
                    <strong>{ex.label}</strong>
                    <span>{ex.detail}</span>
                  </button>
                ))}
                <p id="prompt-hint">
                  Use a fictional student for this demo. Refreshing the page clears your work.
                </p>
              </div>
            </div>
          ) : undefined
        }

        status={
          stage === 'brief'
            ? `${prompt.length.toLocaleString()} / 4,000 characters · Only in this tab`
            : stage === 'preferences'
              ? 'Check the details before continuing'
              : `${items.length} colleges selected · Only in this tab`
        }
        actions={
          <>
            {stage !== 'brief' && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (stage === 'preferences' && profile) {
                    setDraft(profile);
                    setStage('colleges');
                    setError('');
                  } else {
                    navigate(
                      stage === 'colleges' || stage === 'preferences' ? 'brief' : 'colleges',
                    );
                  }
                }}
              >
                <ArrowLeft size={16} /> {stage === 'preferences' && profile ? 'Cancel' : 'Back'}
              </Button>
            )}
            {stage === 'brief' && (
              <Button variant="primary" type="submit" form="student-brief-form">
                Find colleges <ArrowRight size={17} />
              </Button>
            )}
            {stage === 'preferences' && (
              <Button variant="primary" type="submit" form="student-preferences-form">
                {result ? 'Update shortlist' : 'Find colleges'} <ArrowRight size={17} />
              </Button>
            )}
            {stage === 'colleges' && (
              <Button
                variant="primary"
                onClick={() => navigate('handout')}
                disabled={!items.length}
              >
                Prepare handout <ArrowRight size={17} />
              </Button>
            )}
            {stage === 'handout' && (
              <StatefulButton
                busy={pdfBusy}
                success={status.startsWith('PDF downloaded')}
                disabled={!items.length || dirty}
                onClick={download}
              />
            )}
          </>
        }
      >
        {guide ? (
          <Walkthrough />
        ) : (
          <main id="main" className={`workspace stage-${stage}`}>
            {stage === 'brief' && (
              <div className="brief-layout">
                <section className="brief-main">
                  <div className="page-heading">
                    <h1 ref={heading} tabIndex={-1}>
                      Let’s get to know your student.
                    </h1>
                    <p>Start with your notes. We’ll find colleges to explore with your student.</p>
                  </div>
                  <form
                    className="brief-paper"
                    id="student-brief-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      interpret();
                    }}
                  >
                    <label className="sr-only" htmlFor="student-story">
                      Student brief
                    </label>
                    <Textarea
                      id="student-story"
                      aria-label="Student description"
                      ref={textarea}
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value);
                        setError('');
                      }}
                      maxLength={MAX_PROMPT_LENGTH}
                      placeholder="Interests, academics, where they call home, and what they want from college…"
                      aria-describedby="prompt-hint"
                    />
                    {error && (
                      <p role="alert" className="error">
                        {error}
                      </p>
                    )}
                  </form>
                </section>
              </div>
            )}
            {stage === 'preferences' && draft && (
              <>
                <div className="page-heading">
                  <h1 ref={heading} tabIndex={-1}>
                    Edit student preferences
                  </h1>
                  <p>Filled from your brief. Review and adjust anything we missed.</p>
                </div>
                <details className="interpretation">
                  <summary>
                    Check how your brief was interpreted <ChevronDown size={15} />
                  </summary>
                  <p>
                    Extraction uses a limited set of rules. It may miss context or interpret a
                    mention as a preference.
                  </p>
                  <ul>
                    {notices.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                  <blockquote>{prompt}</blockquote>
                </details>
                {notices.some((n) => n.includes('residence is unconfirmed')) && (
                  <p className="inline-warning">
                    Please confirm the home state. A mention of a place doesn’t always mean the
                    student lives there.
                  </p>
                )}
                {profile && dirty && (
                  <button
                    className="text-button discard-changes"
                    onClick={() => {
                      setDraft(profile);
                      setPrompt(appliedPrompt);
                      setParsedPrompt(appliedPrompt);
                      setNotices(parseStudent(appliedPrompt).notices);
                      setError('');
                      setStage('colleges');
                    }}
                  >
                    Discard edits and return to current list
                  </button>
                )}
                <ProfileEditor
                  draft={draft}
                  setDraft={setDraft}
                  onApply={apply}
                  hasList={!!result}
                />
              </>
            )}
            {stage === 'colleges' && result && profile && (
              <>
                <div className="review-layout">
                  <PreferenceSummary
                    profile={profile}
                    notices={notices}
                    onEdit={() => navigate('preferences')}
                  />
                  <section className="shortlist" aria-label="Recommended colleges">
                    <div className="college-search">
                      <Search size={17} aria-hidden="true" />
                      <input
                        aria-label="Search matching colleges"
                        type="search"
                        placeholder="Search colleges, cities, or states…"
                        value={collegeQuery}
                        onChange={(event) => {
                          setCollegeQuery(event.target.value);
                          setVisibleCount(10);
                        }}
                      />
                    </div>
                    <div className="list-toolbar">
                      <strong>Colleges to consider</strong>
                      {excluded.length > 0 && (
                        <button className="text-button" onClick={() => setExcluded([])}>
                          <RotateCcw size={14} />
                          Restore all
                        </button>
                      )}
                    </div>
                    <div className="filter-tabs" aria-label="Filter by academic comparison">
                      {(['All', 'Safety', 'Target', 'Reach'] as const).map((b) => (
                        <button
                          key={b}
                          aria-label={`${b} ${b === 'All' ? discovery.length : discovery.filter((r) => r.band === b).length}`}
                          aria-pressed={filter === b}
                          data-band={b.toLowerCase()}
                          className={filter === b ? 'selected' : ''}
                          disabled={b !== 'All' && !discovery.some((r) => r.band === b)}
                          onClick={() => {
                            setFilter(b);
                            setVisibleCount(10);
                          }}
                        >
                          {b}
                          <span>
                            {b === 'All'
                              ? discovery.length
                              : discovery.filter((r) => r.band === b).length}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="college-list">
                      {matchingColleges.slice(0, visibleCount).map((r) => (
                        <CollegeCard
                          key={r.college.id}
                          item={r}
                          index={discovery.indexOf(r)}
                          included={items.some((item) => item.college.id === r.college.id)}
                          onToggle={() => {
                            if (!result.items.some((item) => item.college.id === r.college.id)) {
                              setResult({ ...result, items: [...result.items, r] });
                            } else {
                              setExcluded((ids) =>
                                ids.includes(r.college.id)
                                  ? ids.filter((id) => id !== r.college.id)
                                  : [...ids, r.college.id],
                              );
                            }
                          }}
                        />
                      ))}
                    </div>
                    <CollegeListEnd
                      shown={visibleCount}
                      total={matchingColleges.length}
                      onLoadMore={showMore}
                    />
                    {result.items.length > 0 && matchingColleges.length === 0 && (
                      <div className="empty-state">
                        <h2>No matching colleges</h2>
                        <p>Try another name or city, or change the comparison filter.</p>
                        <Button
                          onClick={() => {
                            setCollegeQuery('');
                            setFilter('All');
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    )}
                    {!result.items.length && (
                      <div className="empty-state" role="region" aria-label="Search guidance">
                        <Search size={28} />
                        <h2>No colleges match yet.</h2>
                        <p>
                          {validateProfile(profile) ||
                            'Try a broader region or college type. Your constraints haven’t been relaxed.'}
                        </p>
                        <Button onClick={() => navigate('preferences')}>Adjust preferences</Button>
                      </div>
                    )}
                    <details className="search-context">
                      <summary>About this shortlist</summary>
                      <p>
                        Figures are institution-wide averages. Net price is not your student’s cost
                        estimate.
                      </p>
                      <p>
                        {subjectLabel(profile.subject)} · Selected from{' '}
                        {result.eligibleCount.toLocaleString()} subject and location matches.
                      </p>
                      <p>Academic comparisons are not admission predictions.</p>
                      {Object.entries(BAND_DESCRIPTIONS).map(([band, description]) => (
                        <p key={band}>
                          <strong>{band}.</strong> {description}
                        </p>
                      ))}
                      {[...result.notices, ...notices].map((n) => (
                        <p key={n}>{n}</p>
                      ))}
                      <CampusPhotoCredits collegeIds={discovery.map((item) => item.college.id)} />
                    </details>
                  </section>
                  <SelectedColleges
                    items={items}
                    onRemove={(id) => setExcluded((ids) => [...ids, id])}
                  />
                </div>
              </>
            )}
            {stage === 'handout' && profile && (
              <>
                <HandoutPreview profile={profile} items={items} note={note}>
                  <label htmlFor="student-note">
                    A note for your student <span className="optional">optional</span>
                  </label>
                  <p>This appears in the PDF. Your original student brief stays private.</p>
                  <Textarea
                    id="student-note"
                    aria-label="Student-facing counselor note"
                    maxLength={600}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setStatus('');
                    }}
                    placeholder="Let’s choose two campuses to visit, then compare costs and the opportunities that matter most to you…"
                  />
                  <div className="note-count">{note.length} / 600</div>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                </HandoutPreview>
              </>
            )}
          </main>
        )}
      </WorkspaceShell>
      <div role="status" aria-live="polite" className={status ? 'toast' : 'sr-only'}>
        {status && (
          <>
            <Check size={16} />
            <span>{status}</span>
            <button aria-label="Dismiss notification" onClick={() => setStatus('')}>
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
