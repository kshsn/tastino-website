interface ParagraphsProps {
  items: string[];
  /** Index of the lead paragraph that gets the larger "big" style, if any. */
  bigIndex?: number;
}

/** Plain-text paragraphs from the copy blocks. React escapes the text, so no HTML is ever injected. */
export function Paragraphs({ items, bigIndex }: ParagraphsProps) {
  return (
    <>
      {items.map((text, i) => (
        <p key={i} className={i === bigIndex ? 'big' : undefined}>
          {text}
        </p>
      ))}
    </>
  );
}
