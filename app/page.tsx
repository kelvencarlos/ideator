"use client";

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

type Project = {
  id: string;
  title: string;
  description: string;
  author: string;
  ownerId: string;
  createdAt?: Timestamp;
  institution?: string;
  course: string;
  semester?: number;
  mode: string;
  ods?: string;
  skills: string[];
  members: number;
  memberIds?: string[];
  maxMembers?: number;
  maxJoiners?: number;
  availability?: string[];
  needed: string[] | string;
  whatsappUrl?: string;
  color: string;
};
type Student = { id: string; name: string; photoURL?: string; course?: string; mode?: string; interests?: string[]; createdAt?: Timestamp; updatedAt?: Timestamp };
type ProjectForm = { title: string; description: string; institution: string; course: string; semester: number | null; maxMembers: number; mode: string; skills: string[]; needed: string[]; availability: string[]; whatsappUrl: string };
type JoinRequest = { userId: string; name: string; photoURL?: string; institution?: string; availability: string[]; status: "pending" | "accepted" | "rejected" | "cancelled"; createdAt?: Timestamp };
const blankForm: ProjectForm = { title: "", description: "", institution: "", course: "", semester: null, maxMembers: 4, mode: "Online", skills: [], needed: [], availability: [], whatsappUrl: "" };
const projectColors = ["mint", "peach", "lavender"];
const availabilityPeriods = ["Meio período", "Período integral"];
const availabilityDays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const institutionOptions = ["FIAP", "Inteli", "Insper", "IBMEC"];
const availabilityKey = (day: string, period: string) => `${day}::${period}`;
function normalizeAvailability(values: string[]) {
  const legacyPeriod = availabilityPeriods.find((period) => values.includes(period));
  const migrated = legacyPeriod ? availabilityDays.filter((day) => values.includes(day)).map((day) => availabilityKey(day, legacyPeriod)) : [];
  return [...values.filter((value) => !availabilityPeriods.includes(value) && !availabilityDays.includes(value)), ...migrated];
}
function getDayPeriod(values: string[], day: string) {
  return availabilityPeriods.find((period) => values.includes(availabilityKey(day, period))) || (values.includes(day) ? availabilityPeriods.find((period) => values.includes(period)) : undefined);
}
function formatAvailability(values: string[]) {
  const normalized = normalizeAvailability(values);
  const days = availabilityDays.flatMap((day) => {
    const period = getDayPeriod(normalized, day);
    return period ? [`${day}: ${period}`] : [];
  });
  return days.join(" · ");
}
const fiapCourseGroups = [
  { label: "Tecnólogo · 2 anos", courses: ["Agentes Inteligentes", "Análise e Desenvolvimento de Sistemas", "Banco de Dados", "Design Gráfico", "Jogos Digitais", "Gestão da Tecnologia da Informação", "Gestão de IA", "Inteligência Artificial", "Marketing", "Segurança Cibernética", "Sistemas para Internet"] },
  { label: "Bacharelado · 4 ou 5 anos", courses: ["Administração", "Ciência da Computação", "Engenharia de Computação", "Engenharia de Software", "Engenharia Mecatrônica", "Sistemas de Informação"] },
];

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
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(blankForm);
  const [skillInput, setSkillInput] = useState("");
  const [neededCourseInput, setNeededCourseInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [joiningProjectId, setJoiningProjectId] = useState("");
  const [requestingProject, setRequestingProject] = useState<Project | null>(null);
  const [requestAvailability, setRequestAvailability] = useState<string[]>([]);
  const [requestInstitution, setRequestInstitution] = useState("");
  const [projectRequests, setProjectRequests] = useState<Record<string, JoinRequest[]>>({});
  const [myProjectRequests, setMyProjectRequests] = useState<Record<string, JoinRequest | null>>({});
  const [dbError, setDbError] = useState("");
  const loginInProgress = useRef(false);
  const pendingCreate = useRef(false);
  const pendingJoinProjectId = useRef("");

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    setMyProjectRequests({});
    setAuthReady(true);
    if (currentUser && pendingCreate.current) {
      pendingCreate.current = false;
      void Promise.all([getDocs(query(collection(db, "projects"), where("ownerId", "==", currentUser.uid))), getDoc(doc(db, "users", currentUser.uid))]).then(([ownedProjects, profile]) => {
        if (!ownedProjects.empty) { setNotice("Cada conta pode criar apenas um projeto."); return; }
        if (profile.data()?.activeProjectId) { setNotice("Você já participa de um projeto e não pode criar outro."); return; }
        const institution = profile.data()?.institution;
        setEditing(null); setForm({ ...blankForm, institution: institutionOptions.includes(institution) ? institution : "" }); setSkillInput(""); setNeededCourseInput(""); setModal(true);
      }).catch((error: Error) => setNotice(`Não foi possível verificar seus projetos: ${error.message}`));
    }
  }), []);

  useEffect(() => onSnapshot(query(collection(db, "projects"), orderBy("createdAt", "desc")), { includeMetadataChanges: true }, (snapshot) => {
    setDbError("");
    setProjects(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Project)));
    setProjectsLoading(snapshot.metadata.fromCache && snapshot.empty);
  }, (error) => {
    setProjectsLoading(false);
    setDbError(error.code === "permission-denied" ? "As regras publicadas no Firebase não permitem leitura. Publique o arquivo firestore.rules no Console do projeto ideator-a0d1c." : `Erro ao acessar o Firestore: ${error.message}`);
  }), []);

  useEffect(() => onSnapshot(collection(db, "users"), { includeMetadataChanges: true }, (snapshot) => {
    setStudents(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Student)));
    setStudentsLoading(snapshot.metadata.fromCache && snapshot.empty);
  }, (error) => {
    setStudentsLoading(false);
    setNotice(error.code === "permission-denied" ? "As regras do Firestore bloquearam a leitura de perfis." : `Erro ao carregar perfis: ${error.message}`);
  }), []);

  useEffect(() => {
    if (!authReady || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const projectId = url.searchParams.get("entrar");
    const project = projectId && projects.find((item) => item.id === projectId);
    if (!projectId || !project) return;
    url.searchParams.delete("entrar");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    if (!user) {
      pendingJoinProjectId.current = projectId;
      void login();
      return;
    }
    startJoinRequest(project);
  }, [authReady, projects, user]);

  useEffect(() => {
    if (!authReady || !user || !pendingJoinProjectId.current) return;
    const project = projects.find((item) => item.id === pendingJoinProjectId.current);
    if (!project) return;
    pendingJoinProjectId.current = "";
    startJoinRequest(project);
  }, [authReady, projects, user]);

  const ownedProjectIds = user ? projects.filter((project) => project.ownerId === user.uid).map((project) => project.id).join(",") : "";
  useEffect(() => {
    const unsubscribers = ownedProjectIds.split(",").filter(Boolean).map((projectId) => onSnapshot(collection(db, "projects", projectId, "requests"), (snapshot) => {
      setProjectRequests((current) => ({ ...current, [projectId]: snapshot.docs.map((item) => ({ userId: item.id, ...item.data() } as JoinRequest)) }));
    }));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [ownedProjectIds]);
  const allProjectIds = projects.map((project) => project.id).join(",");
  useEffect(() => {
    if (!user) return;
    const unsubscribers = allProjectIds.split(",").filter(Boolean).map((projectId) => onSnapshot(doc(db, "projects", projectId, "requests", user.uid), (snapshot) => {
      setMyProjectRequests((current) => ({ ...current, [projectId]: snapshot.exists() ? ({ userId: user.uid, ...snapshot.data() } as JoinRequest) : null }));
    }));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [allProjectIds, user]);

  useEffect(() => {
    if (!user) return;
    const profileRef = doc(db, "users", user.uid);
    void getDocs(query(collection(db, "projects"), where("ownerId", "==", user.uid))).then(async (ownedProjects) => {
      const existingOwnedProjectId = ownedProjects.docs[0]?.id;
      await runTransaction(db, async (transaction) => {
        const profile = await transaction.get(profileRef);
        const profileData = profile.data() || {};
        transaction.set(profileRef, {
          name: user.displayName || user.email?.split("@")[0] || "Estudante",
          photoURL: user.photoURL || "",
          updatedAt: serverTimestamp(),
          ...(!profileData.createdAt ? { createdAt: serverTimestamp() } : {}),
          ...(!profileData.createdProjectId && existingOwnedProjectId ? { createdProjectId: existingOwnedProjectId } : {}),
          ...(!profileData.activeProjectId && existingOwnedProjectId ? { activeProjectId: existingOwnedProjectId } : {}),
        }, { merge: true });
      });
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

  const visibleProjects = useMemo(() => projects.filter((project) => `${project.title} ${project.description} ${project.institution || ""} ${project.skills.join(" ")} ${project.ods || ""}`.toLowerCase().includes(queryText.toLowerCase()) && (mode === "Todos os formatos" || project.mode === mode)), [projects, queryText, mode]);
  const recentStudents = useMemo(() => [...students].sort((a, b) => (b.createdAt?.toMillis() ?? b.updatedAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? a.updatedAt?.toMillis() ?? 0)).slice(0, 4), [students]);
  const hasCreatedProject = Boolean(user && projects.some((project) => project.ownerId === user.uid));
  const getProjectMemberIds = (project: Project) => project.memberIds?.length ? project.memberIds : [project.ownerId];
  const getProjectMembers = (project: Project) => getProjectMemberIds(project).filter((id) => id !== project.ownerId).map((id) => students.find((student) => student.id === id)).filter((member): member is Student => Boolean(member));
  const getProjectMemberCount = (project: Project) => getProjectMemberIds(project).filter((id) => id !== project.ownerId).length;
  const getProjectJoinerLimit = (project: Project) => Math.max(0, project.maxJoiners ?? ((project.maxMembers || 5) - 1));

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
  async function openCreate() {
    if (!user) { pendingCreate.current = true; void login(); return; }
    try {
      const [ownedProjects, profile] = await Promise.all([getDocs(query(collection(db, "projects"), where("ownerId", "==", user.uid))), getDoc(doc(db, "users", user.uid))]);
      if (!ownedProjects.empty) { setNotice("Cada conta pode criar apenas um projeto."); return; }
      if (profile.data()?.activeProjectId) { setNotice("Você já participa de um projeto e não pode criar outro."); return; }
      const institution = profile.data()?.institution;
      setEditing(null); setForm({ ...blankForm, institution: institutionOptions.includes(institution) ? institution : "" }); setSkillInput(""); setNeededCourseInput(""); setModal(true);
    } catch (error) { setNotice(`Não foi possível verificar seus projetos: ${(error as Error).message}`); }
  }
  function openEdit(project: Project) {
    setEditing(project);
    const legacyCourse = project.course.match(/^(.*?)\s*[·-]\s*(\d{1,2})(?:º|°)?\s*(?:semestre)?$/i);
    const savedNeeded = Array.isArray(project.needed) ? project.needed : project.needed ? [project.needed] : [];
    const needed = savedNeeded.filter((course) => course !== "Indiferente");
    const savedAvailability = project.availability || [];
    setForm({ title: project.title, description: project.description, institution: institutionOptions.includes(project.institution || "") ? project.institution || "" : "", course: legacyCourse ? legacyCourse[1].trim() : project.course, semester: project.semester || (legacyCourse ? Number(legacyCourse[2]) : null), maxMembers: Math.max(1, project.maxJoiners ?? ((project.maxMembers || 5) - 1)), mode: project.mode, skills: project.skills || [], needed, availability: normalizeAvailability(savedAvailability), whatsappUrl: project.whatsappUrl || "" });
    setSkillInput("");
    setNeededCourseInput("");
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
  function addNeededCourse() {
    const course = neededCourseInput;
    if (!course) return;
    setForm({ ...form, needed: [...new Set([...form.needed, course])] });
    setNeededCourseInput("");
  }
  function removeNeededCourse(courseToRemove: string) {
    setForm({ ...form, needed: form.needed.filter((course) => course !== courseToRemove) });
  }
  function toggleDayAvailability(day: string, period: string, selected: string[], update: (next: string[]) => void) {
    const normalized = normalizeAvailability(selected);
    const current = getDayPeriod(normalized, day);
    const withoutDay = normalized.filter((item) => !item.startsWith(`${day}::`));
    update(current === period ? withoutDay : [...withoutDay, availabilityKey(day, period)]);
  }
  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!form.institution.trim()) { setNotice("Informe a instituição do projeto."); return; }
    if (!form.semester) { setNotice("Selecione seu semestre para continuar."); return; }
    const whatsappUrl = normalizeWhatsAppUrl(form.whatsappUrl);
    if (whatsappUrl === null) { setNotice("Use um link HTTPS válido de grupo ou canal do WhatsApp."); return; }
    if (!whatsappUrl) { setNotice("Adicione o link do grupo ou canal do WhatsApp."); return; }
    setSaving(true);
    const values = {
      title: form.title.trim(), description: form.description.trim(), institution: form.institution.trim(), course: form.course.trim(), semester: form.semester, mode: form.mode,
      skills: form.skills, needed: form.needed, availability: form.availability, maxJoiners: form.maxMembers, whatsappUrl,
      author: user.displayName || user.email?.split("@")[0] || "Estudante", updatedAt: serverTimestamp(),
    };
    try {
      if (editing) await updateDoc(doc(db, "projects", editing.id), values);
      else {
        const projectRef = doc(collection(db, "projects"));
        const profileRef = doc(db, "users", user.uid);
        const ownedProjects = await getDocs(query(collection(db, "projects"), where("ownerId", "==", user.uid)));
        if (!ownedProjects.empty) throw new Error("Cada conta pode criar apenas um projeto.");
        await runTransaction(db, async (transaction) => {
          const profileSnapshot = await transaction.get(profileRef);
          const profile = profileSnapshot.data() || {};
          if (profile.createdProjectId) throw new Error("Cada conta pode criar apenas um projeto.");
          if (profile.activeProjectId) throw new Error("Você já participa de outro projeto e não pode criar um segundo projeto.");
          transaction.set(projectRef, { ...values, ownerId: user.uid, members: 1, memberIds: [user.uid], createdAt: serverTimestamp() });
          transaction.set(profileRef, { institution: form.institution.trim(), createdProjectId: projectRef.id, activeProjectId: projectRef.id, pendingProjectIds: [] }, { merge: true });
        });
      }
      setModal(false); setNotice(editing ? "Projeto atualizado." : "Projeto publicado.");
    } catch (error) { setNotice(`Não foi possível salvar: ${(error as Error).message}`); }
    finally { setSaving(false); }
  }
  function startJoinRequest(project: Project) {
    if (!user) { setNotice("Entre com Google para solicitar uma vaga."); void login(); return; }
    setRequestAvailability([]);
    setRequestInstitution("");
    setRequestingProject(project);
    void getDoc(doc(db, "users", user.uid)).then((profile) => { const savedInstitution = profile.data()?.institution; if (institutionOptions.includes(savedInstitution)) setRequestInstitution(savedInstitution); }).catch(() => {});
  }
  async function submitJoinRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !requestingProject) return;
    if (!requestInstitution.trim()) { setNotice("Selecione sua instituição."); return; }
    if (!requestAvailability.length) { setNotice("Informe sua disponibilidade em pelo menos um dia."); return; }
    setJoiningProjectId(requestingProject.id);
    try {
      const requestRef = doc(db, "projects", requestingProject.id, "requests", user.uid);
      const userRef = doc(db, "users", user.uid);
      const outcome = await runTransaction(db, async (transaction) => {
        const [current, profile] = await Promise.all([transaction.get(requestRef), transaction.get(userRef)]);
        if (current.exists() && ["pending", "accepted"].includes(current.data().status)) return current.data().status as string;
        const profileData = profile.data() || {};
        if (profileData.activeProjectId) return "already-member";
        const pendingProjectIds = Array.isArray(profileData.pendingProjectIds) ? profileData.pendingProjectIds as string[] : [];
        transaction.set(requestRef, { userId: user.uid, name: user.displayName || user.email?.split("@")[0] || "Estudante", photoURL: user.photoURL || "", institution: requestInstitution.trim(), availability: requestAvailability, status: "pending", createdAt: serverTimestamp() });
        transaction.set(userRef, { institution: requestInstitution.trim(), pendingProjectIds: [...new Set([...pendingProjectIds, requestingProject.id])] }, { merge: true });
        return "pending";
      });
      setRequestingProject(null);
      setNotice(outcome === "accepted" ? "Você já faz parte deste projeto." : outcome === "already-member" ? "Você já faz parte de um projeto e não pode entrar em outro." : outcome === "pending" ? "Pedido enviado. O criador do projeto vai analisar sua disponibilidade." : "Seu pedido foi enviado novamente.");
    } catch (error) { setNotice(`Não foi possível enviar o pedido: ${(error as Error).message}`); }
    finally { setJoiningProjectId(""); }
  }
  async function shareProject(project: Project) {
    const url = `${window.location.origin}/projeto/${project.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: project.title, text: `Conheça o projeto ${project.title} no ideator.`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("Link do projeto copiado.");
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") setNotice("Não foi possível compartilhar o link do projeto.");
    }
  }
  async function reviewJoinRequest(project: Project, request: JoinRequest, accept: boolean) {
    if (!user || user.uid !== project.ownerId) return;
    setJoiningProjectId(project.id);
    try {
      const projectRef = doc(db, "projects", project.id);
      const requestRef = doc(db, "projects", project.id, "requests", request.userId);
      const outcome = await runTransaction(db, async (transaction) => {
        const [projectSnapshot, requestSnapshot, profileSnapshot] = await Promise.all([transaction.get(projectRef), transaction.get(requestRef), transaction.get(doc(db, "users", request.userId))]);
        if (!projectSnapshot.exists() || !requestSnapshot.exists() || requestSnapshot.data().status !== "pending") return "stale";
        const profileData = profileSnapshot.data() || {};
        if (!accept) { transaction.update(requestRef, { status: "rejected" }); return "rejected"; }
        if (profileData.activeProjectId) return "already-member";
        const data = projectSnapshot.data();
        const memberIds = Array.isArray(data.memberIds) ? data.memberIds as string[] : data.ownerId ? [data.ownerId as string] : [];
        const maxJoiners = Number(data.maxJoiners ?? ((Number(data.maxMembers) || 5) - 1));
        const joinerCount = memberIds.filter((id) => id !== data.ownerId).length;
        if (!memberIds.includes(request.userId) && joinerCount >= maxJoiners) return "full";
        const nextIds = memberIds.includes(request.userId) ? memberIds : [...memberIds, request.userId];
        transaction.update(projectRef, { memberIds: nextIds, members: nextIds.length, maxJoiners });
        transaction.update(requestRef, { status: "accepted" });
        const pendingProjectIds = Array.isArray(profileData.pendingProjectIds) ? profileData.pendingProjectIds as string[] : [];
        for (const pendingProjectId of pendingProjectIds.filter((id) => id !== project.id)) transaction.update(doc(db, "projects", pendingProjectId, "requests", request.userId), { status: "cancelled" });
        transaction.set(doc(db, "users", request.userId), { activeProjectId: project.id, pendingProjectIds: [] }, { merge: true });
        return "accepted";
      });
      setNotice(outcome === "accepted" ? `Pedido de ${request.name} aceito. Os outros pedidos dessa pessoa foram cancelados.` : outcome === "rejected" ? `Pedido de ${request.name} recusado.` : outcome === "full" ? "O projeto atingiu o limite. Aumente o limite antes de aceitar mais pessoas." : outcome === "already-member" ? "Essa pessoa já faz parte de outro projeto." : "Este pedido já foi atualizado.");
    } catch (error) { setNotice(`Não foi possível atualizar o pedido: ${(error as Error).message}`); }
    finally { setJoiningProjectId(""); }
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
        <nav className="main-nav" aria-label="Navegação principal"><a className="nav-active" href="#explorar">Explorar</a><a href="/como-funciona">Como funciona</a></nav>
        {user ? <div className="account-area">{user.photoURL && <Image className="account-photo" src={user.photoURL} width={28} height={28} alt="" />}<span className="account-name">{user.displayName || user.email}</span><button className="profile-button" onClick={() => void logout()}>Sair</button></div> : <button className="profile-button" onClick={() => void login()} disabled={signingIn}>{signingIn ? "Conectando…" : "Entrar com Google"}</button>}
      </header>
      {!user && <section className="hero" id="inicio">
        <div className="hero-copy"><h1>Boas ideias começam com <span>boas conexões.</span></h1>{studentsLoading ? <div className="recent-community recent-loading" role="status"><span className="loading-indicator" aria-hidden="true" />Carregando comunidade…</div> : recentStudents.length > 0 && <div className="recent-community" role="group" aria-label="Pessoas que chegaram recentemente"><div className="recent-avatars">{recentStudents.map((student) => <span className="recent-avatar" key={student.id} title={student.name} role="img" aria-label={student.name}>{student.photoURL ? <Image src={student.photoURL} width={48} height={48} alt="" /> : student.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>)}</div></div>}<p>Encontre um projeto para entrar ou reúna pessoas para tirar sua ideia do papel.</p><div className="hero-actions"><a className="hero-cta" href="#explorar">Explorar projetos</a><button className="hero-secondary" onClick={openCreate} disabled={signingIn}>{signingIn ? "Conectando…" : "Criar projeto"}</button></div></div>
        <div className="hero-art" aria-label="Ideias se conectando"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="floating-note note-top"><span className="note-icon mint-icon">✳</span><span><b>Uma ideia?</b><small>Tem gente pra construir.</small></span></div><div className="idea-core"><span className="core-spark">✳</span><span>ideias que<br /><b>se encontram</b></span></div><div className="orbit-node node-one">✦</div><div className="orbit-node node-two">↗</div><div className="orbit-node node-three">●</div><div className="floating-note note-bottom"><span className="note-icon peach-icon">⌘</span><span><b>Seu próximo projeto</b><small>pode estar aqui.</small></span><span className="note-arrow">↗</span></div><span className="art-caption">IDEIAS LOCAIS. IMPACTO REAL.</span></div>
        <div className="hero-bottom"><span>UM PONTO DE ENCONTRO PARA QUEM FAZ</span><span>COMUNIDADE · 2026</span></div>
      </section>}
      <section className="explore-section" id="explorar">
        <div className="section-heading"><div><h2>Projetos recentes</h2></div><button className="create-button" onClick={openCreate} disabled={signingIn || hasCreatedProject}><span>＋</span> {signingIn ? "Conectando…" : hasCreatedProject ? "Você já criou um projeto" : "Criar projeto"}</button></div>
        {dbError && <div className="database-error" role="alert"><div><strong>Firestore bloqueou o acesso</strong><p>{dbError}</p></div><a href="https://console.firebase.google.com/project/ideator-a0d1c/firestore/databases/-default-/rules" target="_blank" rel="noreferrer">Abrir regras do Firestore</a></div>}
        <div className="explore-toolbar"><div className="project-count">{projectsLoading ? "Carregando projetos…" : `${projects.length} projetos`}</div><div className="filters"><label className="search-box"><span className="search-icon" aria-hidden="true" /><input aria-label="Buscar projetos" placeholder="Buscar projetos, instituições e habilidades..." value={queryText} onChange={(event) => setQueryText(event.target.value)} /><kbd>⌘ K</kbd></label><select aria-label="Filtrar por formato" value={mode} onChange={(event) => setMode(event.target.value)}><option>Todos os formatos</option><option>Online</option><option>Presencial</option><option>Híbrido</option></select></div></div>
        {projectsLoading && <div className="project-loading" role="status"><span className="loading-indicator" aria-hidden="true" />Carregando projetos…</div>}{!projectsLoading && <div className="project-grid">{visibleProjects.map((project, index) => { const memberIds = getProjectMemberIds(project); const memberCount = getProjectMemberCount(project); const maxJoiners = getProjectJoinerLimit(project); const alreadyMember = Boolean(user && memberIds.includes(user.uid)); const joinedElsewhere = Boolean(user && projects.some((other) => other.id !== project.id && getProjectMemberIds(other).includes(user.uid))); const full = memberCount >= maxJoiners; const members = getProjectMembers(project).slice(0, 4); const authorPhoto = students.find((student) => student.id === project.ownerId)?.photoURL; const whatsappUrl = normalizeWhatsAppUrl(project.whatsappUrl || ""); const neededCourses = Array.isArray(project.needed) ? project.needed : project.needed ? [project.needed] : []; const availability = project.availability || []; const availabilitySummary = formatAvailability(availability); const pendingRequests = (projectRequests[project.id] || []).filter((item) => item.status === "pending"); const acceptsAnyCourse = !neededCourses.length || neededCourses.includes("Indiferente"); return <article className="project-card" key={project.id}><div className={`project-art ${projectColors[index % projectColors.length]}`}><span className="project-ods">{project.ods || ""}</span><span className="project-symbol">{index % 3 === 0 ? "⌖" : index % 3 === 1 ? "⌁" : "◌"}</span><span className="project-format">● &nbsp;{project.mode}</span></div><div className="project-content"><div className="project-tags"><span className="project-mode-tag">{project.mode}</span>{project.institution && <span className="institution-tag">{project.institution}</span>}</div><div className="project-author"><span className="author-avatar">{authorPhoto ? <Image src={authorPhoto} width={42} height={42} alt="" /> : project.author.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="project-author-info"><span>{project.author}</span><small>{project.course}{project.semester ? ` · ${project.semester}º semestre` : ""}</small>{project.createdAt && <small className="project-date">Publicado em {project.createdAt.toDate().toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}</small>}</span>{user?.uid === project.ownerId && <div className="owner-actions"><button className="share-project-button" aria-label="Compartilhar projeto" title="Compartilhar projeto" onClick={() => void shareProject(project)}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4"/></svg></button><button aria-label="Editar projeto" onClick={() => openEdit(project)}>Editar</button><button aria-label="Excluir projeto" onClick={() => void removeProject(project)}>Excluir</button></div>}</div><h3>{project.title}</h3><p>{project.description}</p><div className="skill-list">{project.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="project-requirements"><p><span>Cursos procurados</span>{acceptsAnyCourse ? "Estudantes de qualquer curso" : `Estudantes de ${neededCourses.join(", ")}`}</p>{availabilitySummary && <p><span>Disponibilidade esperada</span>{availabilitySummary}</p>}</div><div className="project-footer"><div className={members.length ? "participant-summary" : "participant-summary no-participants"}><div className="participant-avatars" aria-label="Participantes do projeto">{members.map((member) => <span className="participant-avatar" key={member.id} title={member.name} aria-label={member.name}>{member.photoURL ? <Image src={member.photoURL} width={34} height={34} alt="" /> : member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>)}{memberCount > members.length && <span className="participant-more">+{memberCount - members.length}</span>}</div><span><b>{memberCount}/{maxJoiners}</b> participantes</span></div>{alreadyMember ? whatsappUrl ? <a className="join-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Abrir grupo</a> : <button className="join-button" disabled title="O responsável ainda não adicionou um convite do WhatsApp">Link indisponível</button> : <button className="join-button" onClick={() => startJoinRequest(project)} disabled={joiningProjectId === project.id || full || joinedElsewhere || myProjectRequests[project.id]?.status === "pending" || myProjectRequests[project.id]?.status === "cancelled"}>{joiningProjectId === project.id ? "Enviando…" : joinedElsewhere ? "Você já participa de um projeto" : full ? "Vagas preenchidas" : myProjectRequests[project.id]?.status === "pending" ? "Pedido pendente" : myProjectRequests[project.id]?.status === "cancelled" ? "Pedido cancelado" : myProjectRequests[project.id]?.status === "rejected" ? "Solicitar novamente" : "Quero entrar no projeto"}</button>}</div>{user?.uid === project.ownerId && pendingRequests.length > 0 && <section className="join-requests" aria-label="Pedidos de entrada"><h4>Pedidos de entrada ({pendingRequests.length})</h4>{pendingRequests.map((request) => <div className="join-request" key={request.userId}><div className="request-person">{request.photoURL ? <Image src={request.photoURL} width={32} height={32} alt="" /> : <span>{request.name.slice(0, 1).toUpperCase()}</span>}<div><b>{request.name}</b><small>{request.institution ? `${request.institution} · ` : ""}{formatAvailability(request.availability)}</small></div></div><div className="request-actions"><button onClick={() => void reviewJoinRequest(project, request, false)} disabled={joiningProjectId === project.id}>Recusar</button><button onClick={() => void reviewJoinRequest(project, request, true)} disabled={joiningProjectId === project.id || memberCount >= maxJoiners}>Aceitar</button></div></div>)}</section>}</div></article>; })}</div>}
        {!projectsLoading && !dbError && visibleProjects.length === 0 && <div className="empty-state">Nenhum projeto por aqui ainda.</div>}
      </section>
      {!user && <section className="how-section" id="como-funciona"><div className="how-intro"><div className="eyebrow muted-eyebrow">Simples assim</div><h2>Da primeira conversa<br />ao projeto de verdade.</h2><p>O próximo desafio pode começar com uma conexão que você ainda não fez.</p></div><div className="steps"><article><span className="step-num">01</span><span className="step-icon">⌕</span><h3>Explore</h3><p>Descubra projetos e pessoas com interesses parecidos com os seus.</p></article><article><span className="step-num">02</span><span className="step-icon">↗</span><h3>Conecte</h3><p>Encontre um projeto para colaborar ou conheça alguém para trocar ideias.</p></article><article><span className="step-num">03</span><span className="step-icon">✳</span><h3>Construa</h3><p>Leve sua ideia mais longe, junto com a comunidade.</p></article></div></section>}
      {!user && <footer className="footer"><a className="brand footer-brand" href="#inicio"><span className="brand-mark">i.</span><span>ideator<span className="brand-dot">.</span></span></a></footer>}
      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}>
        <section className="project-modal project-editor" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-close" aria-label="Fechar" onClick={() => setModal(false)}>×</button>
          <header className="editor-heading"><h2 id="modal-title">{editing ? "Editar projeto" : "Criar projeto"}</h2><p>Apresente sua ideia e reúna as pessoas certas para construí-la.</p></header>
          <form onSubmit={(event) => void saveProject(event)}>
            <section className="editor-section">
              <div className="editor-section-heading"><div><h3>O projeto</h3><p>Comece pelo que você quer tirar do papel.</p></div></div>
              <div className="editor-fields">
                <label className="editor-field">Nome do projeto<input required maxLength={70} placeholder="Ex.: Amparo" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                <label className="editor-field">O que o projeto resolve?<textarea required maxLength={400} rows={3} placeholder="Descreva o problema e a ideia em poucas frases." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                <label className="editor-field">Sua instituição<select required value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })}><option value="">Escolha sua instituição</option>{institutionOptions.map((institution) => <option key={institution}>{institution}</option>)}</select></label>
                <div className="editor-grid">
                  <label className="editor-field">Seu curso<input required placeholder="Ex.: Ciência da Computação" value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })} /></label>
                  <fieldset className="semester-field"><legend>Semestre</legend><div className="semester-options">{Array.from({ length: 10 }, (_, index) => index + 1).map((semester) => <button key={semester} type="button" aria-label={`${semester}º semestre`} aria-pressed={form.semester === semester} className={form.semester === semester ? "semester-option selected" : "semester-option"} onClick={() => setForm({ ...form, semester })}>{semester}</button>)}</div></fieldset>
                </div>
              </div>
            </section>
            <section className="editor-section">
              <div className="editor-section-heading"><div><h3>Monte seu grupo</h3><p>Defina o formato, o tamanho e o que cada pessoa pode trazer.</p></div></div>
              <div className="editor-fields">
                <div className="editor-grid">
                  <label className="editor-field">Formato<select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option>Online</option><option>Presencial</option><option>Híbrido</option></select></label>
                  <label className="editor-field">Vagas para participantes<input required type="number" min={1} max={50} value={form.maxMembers} onChange={(event) => setForm({ ...form, maxMembers: Math.min(50, Math.max(1, Number(event.target.value) || 1)) })} /><small>Além de você, que criou o projeto</small></label>
                </div>
                <fieldset className="skills-field"><legend>Competências necessárias</legend><div className="skill-entry">{form.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}<button type="button" aria-label={`Remover competência ${skill}`} onClick={() => removeSkill(skill)}>×</button></span>)}<input aria-label="Nova competência" placeholder="Digite uma competência" value={skillInput} onChange={(event) => setSkillInput(event.target.value)} onKeyDown={handleSkillKeyDown} /><button className="add-skill" type="button" onClick={addSkill}>Adicionar</button></div><small>Adicione uma competência por vez.</small></fieldset>
                <fieldset className="availability-field"><legend>Disponibilidade esperada</legend><div className="availability-days-grid">{availabilityDays.map((day) => <div className="availability-day-row" key={day}><span>{day}</span><div className="availability-day-periods">{availabilityPeriods.map((period) => <button key={period} type="button" aria-label={`${day}: ${period}`} aria-pressed={getDayPeriod(form.availability, day) === period} className={getDayPeriod(form.availability, day) === period ? "availability-option selected" : "availability-option"} onClick={() => toggleDayAvailability(day, period, form.availability, (availability) => setForm({ ...form, availability }))}>{period}</button>)}</div></div>)}</div><small>Escolha meio período ou período integral para cada dia em que espera colaboração.</small></fieldset>
                <fieldset className="skills-field"><legend>Quem você está buscando?</legend><div className="skill-entry">{form.needed.map((course) => <span className="skill-chip" key={course}>{course}<button type="button" aria-label={`Remover ${course}`} onClick={() => removeNeededCourse(course)}>×</button></span>)}<select aria-label="Escolher curso" value={neededCourseInput} onChange={(event) => setNeededCourseInput(event.target.value)}><option value="">Escolha um curso</option>{fiapCourseGroups.map((group) => <optgroup key={group.label} label={group.label}>{group.courses.map((course) => <option key={course}>{course}</option>)}</optgroup>)}</select><button className="add-skill" type="button" onClick={addNeededCourse} disabled={!neededCourseInput}>Adicionar</button></div><small>Adicione os cursos que procura. Se não selecionar nenhum, o projeto aceita estudantes de qualquer curso.</small></fieldset>
              </div>
            </section>
            <section className="editor-section editor-contact">
              <div className="editor-section-heading"><div><h3>Onde o grupo se encontra</h3><p>O link será liberado às pessoas que você aceitar.</p></div></div>
              <label className="editor-field">Link do grupo ou canal do WhatsApp<input required type="url" placeholder="https://chat.whatsapp.com/..." value={form.whatsappUrl} onChange={(event) => setForm({ ...form, whatsappUrl: event.target.value })} /></label>
            </section>
            <div className="editor-actions"><span>Você poderá editar essas informações depois.</span><button className="modal-submit" type="submit" disabled={saving}>{saving ? "Salvando…" : editing ? "Salvar alterações" : "Publicar projeto"}</button></div>
          </form>
        </section>
      </div>}      {requestingProject && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRequestingProject(null); }}>
        <section className="project-modal request-modal" role="dialog" aria-modal="true" aria-labelledby="request-title">
          <button className="modal-close" aria-label="Fechar" onClick={() => setRequestingProject(null)}>×</button>
          <header className="editor-heading"><span className="editor-kicker">PEDIDO DE ENTRADA</span><h2 id="request-title">{requestingProject.title}</h2></header>

          <form onSubmit={(event) => void submitJoinRequest(event)}><section className="editor-section request-editor-section"><div className="editor-section-heading"><div><h3>Sua instituição</h3><p>Informe onde você estuda.</p></div></div><label className="editor-field"><select aria-label="Escolha sua instituição" required value={requestInstitution} onChange={(event) => setRequestInstitution(event.target.value)}><option value="">Escolha sua instituição</option>{institutionOptions.map((institution) => <option key={institution}>{institution}</option>)}</select></label></section><section className="editor-section request-editor-section"><div className="editor-section-heading"><div><h3>Sua disponibilidade</h3><p>Escolha meio período ou período integral para cada dia em que pode colaborar.</p></div></div><fieldset className="availability-field"><legend>Disponibilidade por dia</legend><div className="availability-days-grid">{availabilityDays.map((day) => <div className="availability-day-row" key={day}><span>{day}</span><div className="availability-day-periods">{availabilityPeriods.map((period) => <button key={period} type="button" aria-label={`${day}: ${period}`} aria-pressed={getDayPeriod(requestAvailability, day) === period} className={getDayPeriod(requestAvailability, day) === period ? "availability-option selected" : "availability-option"} onClick={() => toggleDayAvailability(day, period, requestAvailability, setRequestAvailability)}>{period}</button>)}</div></div>)}</div></fieldset></section><div className="editor-actions"><span>Sua solicitação de entrada será avaliada pelo criador do projeto.</span><button className="modal-submit" type="submit" disabled={joiningProjectId === requestingProject.id}>{joiningProjectId === requestingProject.id ? "Enviando pedido…" : "Enviar pedido"}</button></div></form>
        </section>
      </div>}      {notice && <div className="toast" role="status">{notice}<button aria-label="Fechar aviso" onClick={() => setNotice("")}>×</button></div>}
    </main>
  );
}
