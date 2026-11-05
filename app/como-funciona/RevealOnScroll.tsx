"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
};

export default function RevealOnScroll({ children, className = "" }: RevealOnScrollProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [motionReady, setMotionReady] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const bounds = element.getBoundingClientRect();
    setIsVisible(bounds.bottom > window.innerHeight * 0.12 && bounds.top < window.innerHeight * 0.88);
    setMotionReady(true);

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { rootMargin: "-12% 0px -12% 0px", threshold: 0 });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      className={`story-reveal ${className}`.trim()}
      data-motion-ready={motionReady}
      data-visible={isVisible}
    >
      {children}
    </div>
  );
}
