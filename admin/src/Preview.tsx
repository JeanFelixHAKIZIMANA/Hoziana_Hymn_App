import type { Stanza } from '../../src/data/hymnal-types';

// A close copy of the app's reader, so editors can see spacing and parts as phones will.
export function Preview({ title, stanzas }: { title: string; stanzas: Stanza[] }) {
  return (
    <div className="phone">
      <h3>{title || 'Untitled'}</h3>
      {stanzas.map((s, i) => {
        const hasParts = s.lines.some((l) => l.part);
        const label = s.type === 'spoken' ? 'Spoken word' : s.type === 'refrain' && !s.continued ? 'Refrain' : null;
        return (
          <div key={i} className={`stanza ${s.type}`}>
            <div className="vnum">{s.type === 'verse' && !s.continued ? s.number : ''}</div>
            <div className="vbody">
              {label ? <div className="overline">{label}</div> : null}
              {s.lines.map((l, j) => (
                <div key={j} className={l.gap ? 'gap' : undefined}>
                  {l.heading ? <div className="overline">Refrain</div> : null}
                  <div className="line">
                  {hasParts ? <span className="part">{l.part ?? ''}</span> : null}
                  <span className="text">
                    {l.text}
                    {l.repeat ? <span className="rep"> ×{l.repeat}</span> : null}
                  </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
