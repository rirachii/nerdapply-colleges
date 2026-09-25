import type { ReactNode } from 'react';
export type Stage = 'brief' | 'preferences' | 'colleges' | 'handout';
const views = [
  { id: 'brief' as const, label: 'Student brief' },
  { id: 'colleges' as const, label: 'College list' },
  { id: 'handout' as const, label: 'Handout' },
];
export function WorkspaceShell({
  children,
  guide,
  stage,
  available,
  onNavigate,
  onNew,
  hasWork,
  actions,
  status,
  headerExtra,
  headerTitle,
}: {
  children: ReactNode;
  guide: boolean;
  stage: Stage;
  available: Stage[];
  onNavigate: (s: Stage) => void;
  onNew: () => void;
  hasWork: boolean;
  actions: ReactNode;
  status: string;
  headerExtra?: ReactNode;
  headerTitle?: ReactNode;
}) {
  return (
    <div
      className={`app-shell${!guide ? (stage === 'colleges' ? ' shortlist-shell' : stage === 'handout' ? ' handout-shell' : '') : ''}`}
    >
      <header className="app-header">
        <a className="brand" href="#" aria-label="NerdApply home">
          <img
            className="brand-logo"
            src="/brand/nerdapply-logo.png"
            alt="NerdApply"
            width="2161"
            height="728"
          />
        </a>
        {headerTitle}
        <div className="header-actions">
          {!guide && headerExtra}
          {hasWork && (
            <button className="text-button" onClick={onNew}>
              New student
            </button>
          )}
          <a href={guide ? '#' : '#guide'}>{guide ? 'Back to your work' : 'How it works'}</a>
          <a
            className="github-link"
            href="https://github.com/rirachii/nerdapply-colleges"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            title="GitHub repository"
          >
            GitHub
          </a>
        </div>
      </header>
      {children}
      {!guide && (
        <footer className="workflow-footer">
          <div className="workflow-progress">
            <nav aria-label="Student workspace">
              {views.map(({ id, label }, index) => (
                <button
                  key={id}
                  aria-label={label}
                  disabled={!available.includes(id)}
                  onClick={() => onNavigate(id)}
                  aria-current={
                    (stage === 'preferences' ? 'colleges' : stage) === id ? 'step' : undefined
                  }
                >
                  <span className="step-number">{index + 1}</span>
                  <span>{label}</span>
                </button>
              ))}
            </nav>
            <p>{status}</p>
          </div>
          <div className="workflow-actions">{actions}</div>
        </footer>
      )}
    </div>
  );
}
