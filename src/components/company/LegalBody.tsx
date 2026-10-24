interface LegalBodyProps {
  paragraphs: string[];
}

/** Legal text: a paragraph starting with "## " is a section heading, everything else is plain text (never HTML). */
export function LegalBody({ paragraphs }: LegalBodyProps) {
  return (
    <>
      {paragraphs.map((p, i) => (p.startsWith('## ') ? <h2 key={i}>{p.slice(3)}</h2> : <p key={i}>{p}</p>))}
    </>
  );
}
