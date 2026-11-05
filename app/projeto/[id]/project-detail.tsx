"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Timestamp, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Project = {
  id: string;
  title: string;
  description: string;
  author: string;
  ownerId: string;
  institution?: string;
  course: string;
  semester?: number;
  mode: string;
  skills?: string[];
  needed?: string[] | string;
  availability?: string[];
  memberIds?: string[];
  maxMembers?: number;
  maxJoiners?: number;
  createdAt?: Timestamp;
};
type AuthorProfile = { photoURL?: string };
const periods = ["Meio período", "Período integral"];
const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function availabilityText(values: string[] = []) {
  const legacyPeriod = periods.find((period) => values.includes(period));
  const dayEntries = days.flatMap((day) => {
    const period = periods.find((value) => values.includes(`${day}::${value}`)) || (values.includes(day) ? legacyPeriod : undefined);
    return period ? [`${day}: ${period}`] : [];
  });
  return dayEntries.join(" · ") || (legacyPeriod && !values.some((value) => days.includes(value)) ? legacyPeriod : "");
}

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [authorPhoto, setAuthorPhoto] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => onSnapshot(doc(db, "projects", projectId), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache && !snapshot.exists()) {
      setLoading(true);
      return;
    }
    setProject(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Project) : null);
    setLoading(false);
    setError("");
  }, (reason) => {
    setError(reason.code === "permission-denied" ? "Este projeto não está disponível." : "Não foi possível carregar o projeto.");
    setLoading(false);
  }), [projectId]);

  useEffect(() => {
    if (!project?.ownerId) return;
    return onSnapshot(doc(db, "users", project.ownerId), (snapshot) => setAuthorPhoto((snapshot.data() as AuthorProfile | undefined)?.photoURL || ""), () => setAuthorPhoto(""));
  }, [project?.ownerId]);

  async function shareProject() {
    const url = `${window.location.origin}/projeto/${projectId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: project?.title || "Projeto no ideator.", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("Link copiado.");
    } catch (reason) {
      if ((reason as DOMException).name !== "AbortError") setNotice("Não foi possível compartilhar este projeto.");
    }
  }

  const needed = Array.isArray(project?.needed) ? project.needed : project?.needed ? [project.needed] : [];
  const acceptsAnyCourse = !needed.length || needed.includes("Indiferente");
  const availability = availabilityText(project?.availability);
  const memberCount = project?.memberIds?.length ? project.memberIds.filter((id) => id !== project.ownerId).length : 0;
  const maxJoiners = Math.max(0, project?.maxJoiners ?? ((project?.maxMembers || 5) - 1));

  return <main className="project-detail-page">
    <header className="project-detail-nav">
      <Link className="project-detail-brand" href="/" aria-label="ideator. início"><span>i</span> ideator.</Link>
      <Link className="project-detail-back" href="/#explorar">Todos os projetos</Link>
    </header>
    <div className="project-detail-wrap">
      {loading ? <div className="project-detail-state" role="status"><span className="loading-indicator" />Carregando projeto…</div> : error || !project ? <div className="project-detail-state" role="status">{error || "Este projeto não foi encontrado."}<Link href="/#explorar">Voltar aos projetos</Link></div> : <>
        <div className="project-detail-breadcrumb"><Link href="/#explorar">Projetos</Link><span>/</span><span>{project.institution || "Comunidade"}</span></div>
        <article className="project-detail-card">
          <div className="project-detail-heading">
            <div className="project-detail-tags"><span>{project.mode}</span>{project.institution && <span>{project.institution}</span>}</div>
            <button className="project-detail-share" type="button" onClick={() => void shareProject()} aria-label="Compartilhar projeto" title="Compartilhar projeto"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4"/></svg></button>
          </div>
          <h1>{project.title}</h1>
          <div className="project-detail-author"><span className="project-detail-avatar">{authorPhoto ? <Image src={authorPhoto} width={42} height={42} alt="" /> : initials(project.author)}</span><span><b>{project.author}</b><small>{project.course}{project.semester ? ` · ${project.semester}º semestre` : ""}</small></span>{project.createdAt && <time dateTime={project.createdAt.toDate().toISOString()}>{project.createdAt.toDate().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</time>}</div>
          <p className="project-detail-description">{project.description}</p>
          <div className="project-detail-stats"><div><b>{memberCount}/{maxJoiners}</b><span>participantes</span></div><div><b>{project.mode}</b><span>formato</span></div></div>
          {project.skills?.length ? <section className="project-detail-section"><h2>Competências necessárias</h2><div className="project-detail-chips">{project.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></section> : null}
          <section className="project-detail-section"><h2>Quem o projeto procura</h2><p>{acceptsAnyCourse ? "Estudantes de qualquer curso" : `Estudantes de ${needed.join(", ")}`}</p></section>
          {availability && <section className="project-detail-section"><h2>Disponibilidade esperada</h2><p>{availability}</p></section>}
          <div className="project-detail-actions"><Link href={`/?entrar=${encodeURIComponent(projectId)}#explorar`} className="project-detail-join">Quero entrar no projeto</Link><span>Sua solicitação será avaliada pelo criador.</span></div>
        </article>
      </>}
    </div>
    {notice && <div className="project-detail-toast" role="status">{notice}<button type="button" aria-label="Fechar aviso" onClick={() => setNotice("")}>×</button></div>}
  </main>;
}
