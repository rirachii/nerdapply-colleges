import { useEffect, useRef } from 'react';

/** Reveal local results just before the counselor reaches the end of the cards. */
export function CollegeListEnd({
  shown,
  total,
  onLoadMore,
}: {
  shown: number;
  total: number;
  onLoadMore: () => void;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = shown < total;
  const automatic = typeof IntersectionObserver !== 'undefined';
  useEffect(() => {
    if (!hasMore || !automatic || !sentinel.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        onLoadMore();
      },
      { rootMargin: '0px 0px 320px 0px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [shown, total, hasMore, automatic, onLoadMore]);

  if (!total) return null;
  return (
    <div ref={sentinel} className="college-list-end" aria-label="College browsing progress">
      <span role="status">
        {hasMore ? 'Scroll to explore more colleges' : 'You’ve seen all matching colleges.'}
      </span>
      {hasMore && !automatic && (
        <button className="text-button" onClick={onLoadMore}>
          Load more colleges
        </button>
      )}
    </div>
  );
}
