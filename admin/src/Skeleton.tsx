// Grey placeholders shaped like the content that's on its way, shown while it downloads,
// so the page doesn't jump around when the real text arrives.

export function SkeletonList({ rows = 10 }: { rows?: number }) {
  return (
    <ul className="card list" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i}>
          <span className="skeleton-row">
            <span className="skeleton" style={{ width: 28 }} />
            <span className="skeleton" style={{ flex: 1, maxWidth: `${55 + ((i * 17) % 35)}%` }} />
            <span className="skeleton" style={{ width: 72 }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SkeletonEditor() {
  return (
    <main className="editor" aria-busy="true" aria-label="Loading">
      <div className="pagehead">
        <span className="skeleton" style={{ width: 220, height: 28 }} />
      </div>
      <div className="card skeleton-form">
        {[40, 70, 55, 85, 30].map((w, i) => (
          <span key={i} className="skeleton" style={{ width: `${w}%` }} />
        ))}
        <span className="skeleton" style={{ height: 220 }} />
      </div>
    </main>
  );
}
