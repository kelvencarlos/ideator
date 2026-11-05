import { Suspense } from "react";
import type { Metadata } from "next";
import ProjectDetail from "./project-detail";

export const metadata: Metadata = {
  title: "Projeto — ideator.",
  description: "Conheça os detalhes deste projeto no ideator.",
};

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<main className="project-detail-page"><div className="project-detail-state" role="status"><span className="loading-indicator" />Carregando projeto…</div></main>}><ResolvedProject params={params} /></Suspense>;
}

async function ResolvedProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetail projectId={id} />;
}
