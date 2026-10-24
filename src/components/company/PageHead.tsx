interface PageHeadProps {
  eyebrow?: string;
  title: string;
  lead?: string;
}

export function PageHead({ eyebrow, title, lead }: PageHeadProps) {
  return (
    <div className="head">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}
