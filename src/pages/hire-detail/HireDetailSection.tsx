import type { ReactNode } from "react";

interface HireDetailSectionProps {
  readonly title: string;
  readonly children: ReactNode;
}

const HireDetailSection = ({ title, children }: HireDetailSectionProps) => (
  <section>
    <h2 className="section-label">{title}</h2>
    {children}
  </section>
);

export default HireDetailSection;
