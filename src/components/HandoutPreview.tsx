import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import type { Recommendation, StudentProfile } from '../lib/types';

export function HandoutPreview({
  profile,
  items,
  note,
  children,
}: {
  profile: StudentProfile;
  items: Recommendation[];
  note: string;
  children?: ReactNode;
}) {
  const [preview, setPreview] = useState({ url: '', error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setPreview({ url: '', error: '' });
    // Wait for a pause in note editing before generating the next document.
    const timer = window.setTimeout(async () => {
      try {
        const { createStudentPdf } = await import('../lib/download');
        if (cancelled) return;
        const blob = await createStudentPdf(profile, items, note);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ url: objectUrl, error: '' });
      } catch {
        if (!cancelled) {
          setPreview({
            url: '',
            error: 'The PDF preview could not be created. Your work is still here.',
          });
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile, items, note, attempt]);

  return (
    <div className="handout-layout">
      <section className="handout-preview" aria-label="Student handout preview">
        {preview.url ? (
          <iframe title="Student handout PDF" src={`${preview.url}#view=FitH`} />
        ) : (
          <div className="handout-preview-state">
            {preview.error ? (
              <>
                <p role="alert">{preview.error}</p>
                <button className="text-button" onClick={() => setAttempt((value) => value + 1)}>
                  Retry preview
                </button>
              </>
            ) : (
              <p role="status">
                <LoaderCircle size={18} className="spin" /> Updating PDF preview…
              </p>
            )}
          </div>
        )}
      </section>
      <section className="handout-controls" aria-label="Handout options">
        {preview.url && (
          <a className="handout-open-pdf" href={preview.url} target="_blank" rel="noreferrer">
            Open PDF <ArrowUpRight size={14} />
          </a>
        )}
        {children}
      </section>
    </div>
  );
}
