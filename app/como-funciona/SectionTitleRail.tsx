"use client";

import { useEffect, useState } from "react";

type SectionTitleRailProps = { initialTitle: string };

export default function SectionTitleRail({ initialTitle }: SectionTitleRailProps) {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section-title]"));
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const updateTitle = () => {
      const center = window.innerHeight / 2;
      const current = sections
        .map((section) => {
          const bounds = section.getBoundingClientRect();
          const distance = center < bounds.top ? bounds.top - center : center > bounds.bottom ? center - bounds.bottom : 0;
          return { section, distance };
        })
        .sort((a, b) => a.distance - b.distance)[0]?.section;
      const nextTitle = current?.dataset.sectionTitle;
      if (nextTitle) setTitle(nextTitle);
    };

    const observer = new IntersectionObserver(updateTitle, { rootMargin: "-38% 0px -38% 0px", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
    updateTitle();

    return () => observer.disconnect();
  }, []);

  return (
    <aside className="how-story-aside" aria-hidden="true">
      <p key={title} className="how-story-active-title">{title}</p>
    </aside>
  );
}
