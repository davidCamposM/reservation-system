type SectionHeadingProps = { eyebrow: string; title: string; description?: string };

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">{eyebrow}</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>{description ? <p className="mt-3 text-base leading-7 text-slate-600">{description}</p> : null}</div>;
}
