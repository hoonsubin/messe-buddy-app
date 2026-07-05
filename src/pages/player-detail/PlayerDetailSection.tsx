import type { ReactNode } from "react";

interface PlayerDetailSectionProps {
  readonly title: string;
  readonly children: ReactNode;
}

const PlayerDetailSection = ({ title, children }: PlayerDetailSectionProps) => (
  <section>
    <h2 className="section-label">{title}</h2>
    {children}
  </section>
);

export default PlayerDetailSection;
