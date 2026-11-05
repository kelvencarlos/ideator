"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { Timestamp, addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

type Project = {
  id: string;
  title: string;
  description: string;
  author: string;
  ownerId: string;
  course: string;
  mode: string;
  ods: string;
  skills: string[];
  members: number;
  needed: string;
  whatsappUrl?: string;
  color: string;
};
type Student = { id: string; name: string; photoURL?: string; course?: string; mode?: string; interests?: string[]; createdAt?: Timestamp; updatedAt?: Timestamp };
type ProjectForm = { title: string; description: string; course: string; mode: string; ods: string; skills: string[]; needed: string; whatsappUrl: string };
const blankForm: ProjectForm = { title: "", description: "", course: "", mode: "Online", ods: "ODS 11 · Cidades", skills: [], needed: "", whatsappUrl: "" };
const projectColors = ["mint", "peach", "lavender"];

function normalizeWhatsAppUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^https:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const allowedHosts = ["chat.whatsapp.com", "whatsapp.com", "www.whatsapp.com", "wa.me", "api.whatsapp.com"];
    if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) return null;
    if ((url.hostname === "whatsapp.com" || url.hostname === "www.whatsapp.com") && !url.pathname.startsWith("/channel/")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function Home() {
  const [queryText, setQueryText] = useState("");
  const [mode, setMode] = useState("Todos os formatos");
  const [notice, setNotice] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(blankForm);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState("");
  const loginInProgress = useRef(false);
  const pendingCreate = useRef(false);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setAuthReady(true);
    if (currentUser && pendingCreate.current) {
      pendingCreate.current = false;
      setEditing(null);
      setForm(blankForm);
      setModal(true);
    }
  }), []);

  useEffect(() => onSnapshot(query(collection(db, "projects"), orderBy("createdAt", "desc")), (snapshot) => {
    setDbError("");
    setProjects(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Project)));
  }, (error) => setDbError(error.code === "permission-denied" ? "As regras publicadas no Firebase não permitem leitura. Publique o arquivo firestore.rules no Console do projeto ideator-a0d1c." : `Erro ao acessar o Firestore: ${error.message}`)), []);

  useEffect(() => onSnapshot(collection(db, "users"), (snapshot) => {
    setStudents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Student)));
  }, (error) => setNotice(error.code === "permission-denied" ? "As regras do Firestore bloquearam a leitura de perfis." : `Erro ao carregar perfis: ${error.message}`)), []);

  useEffect(() => {
    if (!user) return;
    const profileRef = doc(db, "users", user.uid);
    void runTransaction(db, async (transaction) => {
      const profile = await transaction.get(profileRef);
      const createdAt = profile.data()?.createdAt;
      transaction.set(profileRef, {
        name: user.displayName || user.email?.split("@")[0] || "Estudante",
        photoURL: user.photoURL || "",
        updatedAt: serverTimestamp(),
        ...(!createdAt ? { createdAt: serverTimestamp() } : {}),
      }, { merge: true });
    }).catch((error: Error) => setNotice(`Não foi possível salvar seu perfil: ${error.message}`));
  }, [user]);

  useEffect(() => {
    if (!modal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".project-modal");
    const focusable = () => dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]');
    const fields = focusable();
    fields?.[1]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setModal(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [modal]);

  const visibleProjects = useMemo(() => projects.filter((project) => `${project.title} ${project.description} ${project.skills.join(" ")} ${project.ods}`.toLowerCase().includes(queryText.toLowerCase()) && (mode === "Todos os formatos" || project.mode === mode)), [projects, queryText, mode]);
  const recentStudents = useMemo(() => [...students].sort((a, b) => (b.createdAt?.toMillis() ?? b.updatedAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? a.updatedAt?.toMillis() ?? 0)).slice(0, 4), [students]);

  async function login() {
    if (loginInProgress.current || auth.currentUser) return;
    loginInProgress.current = true;
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (auth.currentUser) return;
      if (code === "auth/unauthorized-domain") {
        setNotice("Este domínio ainda não está autorizado no Firebase. Adicione ideator-xi.vercel.app em Authentication → Settings → Authorized domains.");
        return;
      }
      if (code === "auth/operation-not-allowed") {
        setNotice("O login com Google está desativado no Firebase Authentication.");
        return;
      }
      if (code === "auth/popup-closed-by-user") return;
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        if (await waitForSignIn(5000)) return;
        setNotice("O login não foi concluído. Permita pop-ups para este site e tente novamente.");
        return;
      }
      setNotice("Não foi possível concluir o login com Google. Tente novamente.");
    } finally {
      loginInProgress.current = false;
      setSigningIn(false);
    }
  }
  function openCreate() {
    if (!user) { pendingCreate.current = true; void login(); return; }
    setEditing(null); setForm(blankForm); setSkillInput(""); setModal(true);
  }
  function openEdit(project: Project) {
    setEditing(project);
    setForm({ title: project.title, description: project.description, course: project.course, mode: project.mode, ods: project.ods, skills: project.skills || [], needed: project.needed, whatsappUrl: project.whatsappUrl || "" });
    setSkillInput("");
    setModal(true);
  }
  function addSkill() {
    const skill = skillInput.trim().replace(/,$/, "");
    if (!skill || form.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) { setSkillInput(""); return; }
    setForm({ ...form, skills: [...form.skills, skill] });
    setSkillInput("");
  }
  function handleSkillKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addSkill(); }
    if (event.key === "Backspace" && !skillInput && form.skills.length) setForm({ ...form, skills: form.skills.slice(0, -1) });
  }
  function removeSkill(skillToRemove: string) {
    setForm({ ...form, skills: form.skills.filter((skill) => skill !== skillToRemove) });
  }
  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const whatsappUrl = normalizeWhatsAppUrl(form.whatsappUrl);
    if (whatsappUrl === null) { setNotice("Use um link HTTPS válido de grupo ou canal do WhatsApp."); return; }
    setSaving(true);
    const values = {
      title: form.title.trim(), description: form.description.trim(), course: form.course.trim(), mode: form.mode,
      ods: form.ods.trim(), skills: form.skills, needed: form.needed.trim(), whatsappUrl,
      author: user.displayName || user.email?.split("@")[0] || "Estudante", updatedAt: serverTimestamp(),
    };
    try {
      if (editing) await updateDoc(doc(db, "projects", editing.id), values);
      else await addDoc(collection(db, "projects"), { ...values, ownerId: user.uid, members: 1, createdAt: serverTimestamp() });
      setModal(false); setNotice(editing ? "Projeto atualizado." : "Projeto publicado.");
    } catch (error) { setNotice(`Não foi possível salvar: ${(error as Error).message}`); }
    finally { setSaving(false); }
  }
  async function removeProject(project: Project) {
    if (!window.confirm(`Excluir o projeto “${project.title}”?`)) return;
    try { await deleteDoc(doc(db, "projects", project.id)); setNotice("Projeto excluído."); }
    catch (error) { setNotice(`Não foi possível excluir: ${(error as Error).message}`); }
  }
  async function logout() { try { await signOut(auth); setNotice("Você saiu da sua conta."); } catch (error) { setNotice((error as Error).message); } }

  function waitForSignIn(timeoutMs: number) {
    if (auth.currentUser) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      let unsubscribe = () => {};
      const timeout = window.setTimeout(() => {
        unsubscribe();
        resolve(Boolean(auth.currentUser));
      }, timeoutMs);
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (!currentUser) return;
        window.clearTimeout(timeout);
        unsubscribe();
        resolve(true);
      });
    });
  }

  if (!authReady) return <main className="auth-loading" role="status" aria-live="polite"><span className="brand"><span className="brand-mark">i.</span><span>ideator<span className="brand-dot">.</span></span></span><span className="loading-indicator" aria-hidden="true" /><span className="sr-only">Carregando sua sessão</span></main>;

  return (
    <main className={user ? "app-shell signed-in" : "app-shell"}>
      <a className="skip-link" href="#explorar">Pular para o conteúdo</a>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Ideator, início"><span className="brand-mark">i.</span><span>ideator<span className="brand-dot">.</span></span></a>
        <nav className="main-nav" aria-label="Navegação principal"><a className="nav-active" href="#explorar">Explorar</a>{!user && <a href="#como-funciona">Como funciona</a>}</nav>
        {user ? <div className="account-area">{user.photoURL && <Image className="account-photo" src={user.photoURL} width={28} height={28} alt="" />}<span className="account-name">{user.displayName || user.email}</span><button className="profile-button" onClick={() => void logout()}>Sair</button></div> : <button className="profile-button" onClick={() => void login()} disabled={signingIn}>{signingIn ? "Conectando…" : "Entrar com Google"}</button>}
      </header>
      {!user && <section className="hero" id="inicio">
        <div className="hero-copy"><h1>Boas ideias começam com <span>boas conexões.</span></h1>{recentStudents.length > 0 && <div className="recent-community" role="group" aria-label="Pessoas que chegaram recentemente"><div className="recent-avatars">{recentStudents.map((student) => <span className="recent-avatar" key={student.id} title={student.name} role="img" aria-label={student.name}>{student.photoURL ? <Image src={student.photoURL} width={48} height={48} alt="" /> : student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>)}</div></div>}<p>Conheça estudantes, encontre um projeto para entrar ou reúna pessoas para tirar sua ideia do papel.</p><div className="hero-actions"><a className="hero-cta" href="#explorar">Explorar projetos</a><button className="hero-secondary" onClick={openCreate} disabled={signingIn}>{signingIn ? "Conectando…" : "Criar projeto"}</button></div></div>
        <div className="hero-art" aria-label="Ideias se conectando"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="floating-note note-top"><span className="note-icon mint-icon">✳</span><span><b>Uma ideia?</b><small>Tem gente pra construir.</small></span></div><div className="idea-core"><span className="core-spark">✳</span><span>ideias que<br /><b>se encontram</b></span></div><div className="orbit-node node-one">✦</div><div className="orbit-node node-two">↗</div><div className="orbit-node node-three">●</div><div className="floating-note note-bottom"><span className="note-icon peach-icon">⌘</span><span><b>Seu próximo projeto</b><small>pode estar aqui.</small></span><span className="note-arrow">↗</span></div><span className="art-caption">IDEIAS LOCAIS. IMPACTO REAL.</span></div>
        <div className="hero-bottom"><span>UM PONTO DE ENCONTRO PARA QUEM FAZ</span><span>COMUNIDADE · 2026</span></div>
      </section>}
      <section className="explore-section" id="explorar">
        <div className="section-heading"><div><div className="eyebrow muted-eyebrow">{user ? "Sua comunidade" : "Ideias novas da comunidade"}</div><h2>Projetos recentes</h2></div><button className="create-button" onClick={openCreate} disabled={signingIn}><span>＋</span> {signingIn ? "Conectando…" : "Criar projeto"}</button></div>
        {dbError && <div className="database-error" role="alert"><div><strong>Firestore bloqueou o acesso</strong><p>{dbError}</p></div><a href="https://console.firebase.google.com/project/ideator-a0d1c/firestore/databases/-default-/rules" target="_blank" rel="noreferrer">Abrir regras do Firestore</a></div>}
        <div className="explore-toolbar"><div className="project-count">{projects.length} projetos</div><div className="filters"><label className="search-box"><span className="search-icon" aria-hidden="true" /><input aria-label="Buscar projetos" placeholder="Buscar projetos, temas, habilidades..." value={queryText} onChange={(event) => setQueryText(event.target.value)} /><kbd>⌘ K</kbd></label><select aria-label="Filtrar por formato" value={mode} onChange={(event) => setMode(event.target.value)}><option>Todos os formatos</option><option>Online</option><option>Presencial</option><option>Híbrido</option></select></div></div>
        <div className="project-grid">{visibleProjects.map((project, index) => <article className="project-card" key={project.id}><div className={`project-art ${projectColors[index % projectColors.length]}`}><span className="project-ods">{project.ods}</span><span className="project-symbol">{index % 3 === 0 ? "⌖" : index % 3 === 1 ? "⌁" : "◌"}</span><span className="project-format">● &nbsp;{project.mode}</span></div><div className="project-content"><div className="project-author"><span className="author-avatar">{project.author.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span>{project.author}<small>{project.course}</small></span>{user?.uid === project.ownerId && <div className="owner-actions"><button aria-label="Editar projeto" onClick={() => openEdit(project)}>Editar</button><button aria-label="Excluir projeto" onClick={() => void removeProject(project)}>Excluir</button></div>}</div><h3>{project.title}</h3><p>{project.description}</p><div className="skill-list">{project.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="project-footer"><span><b>{project.members}</b> participantes <i>·</i> busca <b>{project.needed}</b></span>{normalizeWhatsAppUrl(project.whatsappUrl || "") ? <a className="join-button" href={normalizeWhatsAppUrl(project.whatsappUrl || "") || undefined} target="_blank" rel="noopener noreferrer">Quero entrar no projeto</a> : <button className="join-button" disabled title="O responsável ainda não adicionou um convite do WhatsApp">Link indisponível</button>}</div></div></article>)}</div>
        {visibleProjects.length === 0 && <div className="empty-state">Nenhum projeto por aqui ainda.</div>}
      </section>
      {!user && <section className="how-section" id="como-funciona"><div className="how-intro"><div className="eyebrow muted-eyebrow">Simples assim</div><h2>Da primeira conversa<br />ao projeto de verdade.</h2><p>O próximo desafio pode começar com uma conexão que você ainda não fez.</p></div><div className="steps"><article><span className="step-num">01</span><span className="step-icon">⌕</span><h3>Explore</h3><p>Descubra projetos e pessoas com interesses parecidos com os seus.</p></article><article><span className="step-num">02</span><span className="step-icon">↗</span><h3>Conecte</h3><p>Encontre um projeto para colaborar ou conheça alguém para trocar ideias.</p></article><article><span className="step-num">03</span><span className="step-icon">✳</span><h3>Construa</h3><p>Leve sua ideia mais longe, junto com a comunidade.</p></article></div></section>}
      {!user && <footer className="footer"><a className="brand footer-brand" href="#inicio"><span className="brand-mark">i.</span><span>ideator<span className="brand-dot">.</span></span></a><span>Feito para conectar quem estuda, cria e transforma.</span><span>Comunidade · 2026</span></footer>}
      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}><section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" aria-label="Fechar" onClick={() => setModal(false)}>×</button><div className="eyebrow muted-eyebrow">Ideator · Projetos</div><h2 id="modal-title">{editing ? "Editar projeto" : "Compartilhe sua ideia"}</h2><p>Conte à comunidade o que você quer construir e quem gostaria de encontrar.</p><form onSubmit={(event) => void saveProject(event)}><label>Nome do projeto<input required maxLength={70} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>O que o projeto resolve?<textarea required maxLength={400} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label>Seu curso e semestre<input required placeholder="Ex.: Engenharia de Software · 2º semestre" value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} /></label><div className="form-row"><label>Formato<select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option>Online</option><option>Presencial</option><option>Híbrido</option></select></label><label>ODS<select value={form.ods} onChange={(event) => setForm({ ...form, ods: event.target.value })}>{["ODS 2 · Fome zero", "ODS 3 · Saúde", "ODS 4 · Educação", "ODS 9 · Inovação", "ODS 10 · Desigualdades", "ODS 11 · Cidades", "ODS 13 · Clima"].map((ods) => <option key={ods}>{ods}</option>)}</select></label></div><fieldset className="skills-field"><legend>Competências necessárias</legend><div className="skill-entry">{form.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}<button type="button" aria-label={`Remover competência ${skill}`} onClick={() => removeSkill(skill)}>×</button></span>)}<input aria-label="Nova competência" placeholder="Ex.: React, UX/UI, pesquisa" value={skillInput} onChange={(event) => setSkillInput(event.target.value)} onKeyDown={handleSkillKeyDown} /><button className="add-skill" type="button" onClick={addSkill}>Adicionar</button></div><small>Adicione uma competência por vez.</small></fieldset><label>Quem você está buscando?<input required placeholder="Ex.: pessoa de UX ou dados" value={form.needed} onChange={(event) => setForm({ ...form, needed: event.target.value })} /></label><label>Link do grupo ou canal do WhatsApp <small>Opcional · convite para entrar no projeto</small><input type="url" placeholder="https://chat.whatsapp.com/..." value={form.whatsappUrl} onChange={(event) => setForm({ ...form, whatsappUrl: event.target.value })} /></label><button className="modal-submit" type="submit" disabled={saving}>{saving ? "Salvando…" : editing ? "Salvar alterações" : "Publicar projeto"}</button></form></section></div>}
      {notice && <div className="toast" role="status">{notice}<button aria-label="Fechar aviso" onClick={() => setNotice("")}>×</button></div>}
    </main>
  );
}
