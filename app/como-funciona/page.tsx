import Link from "next/link";

export const metadata = {
  title: "Como funciona — ideator.",
  description: "Entenda como encontrar pessoas e construir projetos juntos no Ideator.",
};

const steps = [
  {
    title: "Explore projetos",
    text: "Consulte projetos de estudantes de diferentes instituições. Busque por tema, competência ou instituição para encontrar iniciativas alinhadas aos seus interesses.",
  },
  {
    title: "Apresente sua ideia",
    text: "Descreva o problema, informe sua instituição e curso e defina as competências, a disponibilidade e o número de vagas do projeto.",
  },
  {
    title: "Solicite sua participação",
    text: "Informe quando pode contribuir. O responsável pelo projeto analisa cada solicitação e confirma a entrada no grupo.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="how-page">
      <header className="how-page-header">
        <Link className="brand" href="/" aria-label="Ideator, início">
          <span className="brand-mark">i.</span>
          <span>ideator<span className="brand-dot">.</span></span>
        </Link>
        <nav aria-label="Navegação da página">
          <Link href="/#explorar">Explorar projetos</Link>
        </nav>
      </header>

      <article>
        <section className="how-story-hero">
          <div className="how-story-intro">
            <h1>Encontre pessoas para desenvolver o próximo projeto.</h1>
            <p className="how-story-lede">
              O Ideator conecta estudantes a projetos em desenvolvimento. Encontre uma iniciativa,
              compartilhe sua ideia ou peça para fazer parte de um grupo.
            </p>
          </div>

          <div className="how-story-art" role="img" aria-label="A palavra Ideia ao centro, conectada às áreas de produto, tecnologia e design">
            <div className="story-orbit story-orbit-a" />
            <div className="story-orbit story-orbit-b" />
            <div className="story-idea">Ideia</div>
            <div className="story-person story-person-one"><span aria-hidden="true">●</span><small>produto</small></div>
            <div className="story-person story-person-two"><span aria-hidden="true">●</span><small>tecnologia</small></div>
            <div className="story-person story-person-three"><span aria-hidden="true">●</span><small>design</small></div>
          </div>
        </section>

        <section className="how-story-body">
          <aside className="how-story-aside">
            <span>Ideator</span>
            <p>Uma plataforma para encontrar colaboradores e desenvolver projetos em conjunto.</p>
          </aside>
          <div className="how-story-copy">
            <section>
              <h2>Projetos exigem competências diferentes</h2>
              <p>
                Desenvolver uma ideia pode exigir conhecimentos diferentes. Muitas vezes, o
                próximo passo depende de encontrar alguém com experiência em tecnologia, produto,
                design ou em outra área importante para o projeto.
              </p>
              <p>
                O Ideator reúne estudantes interessados em colaborar. A plataforma permite
                apresentar uma proposta, conhecer projetos de outras instituições e encontrar
                pessoas dispostas a contribuir com competências e disponibilidade diferentes.
              </p>
              <p>
                Para publicar uma ideia ou solicitar participação, entre com sua conta Google.
                Cada projeto apresenta o nome, a instituição e o curso de quem o criou.
              </p>
            </section>

            <section>
              <h2>Como participar</h2>
              <div className="how-story-steps">
                {steps.map((step) => (
                  <article key={step.title}>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2>Regras claras para cada projeto</h2>
              <p>
                Quem publica define as competências procuradas, os dias e períodos de trabalho
                e o número de vagas. O limite considera apenas as pessoas que podem entrar; quem
                criou o projeto não ocupa uma vaga.
              </p>
              <p>
                O responsável avalia os pedidos antes de aceitar novos participantes. Você pode
                solicitar entrada em mais de um projeto, mas só pode participar de um por vez.
                Quando um pedido é aceito, os demais pedidos pendentes são cancelados. Quem cria
                um projeto também não pode participar de outro.
              </p>
              <p>
                Após a aprovação, o link do grupo de WhatsApp fica disponível para a pessoa
                aceita. A partir daí, o grupo pode alinhar atividades e próximos passos.
              </p>
            </section>

            <section className="how-story-last">
              <h2>Encontre um projeto para participar</h2>
              <p>
                Consulte os projetos publicados e solicite entrada naquele em que pode contribuir.
                Se você já tem uma proposta, publique e encontre colaboradores.
              </p>
              <Link className="how-story-cta" href="/#explorar">Explorar projetos</Link>
            </section>
          </div>
        </section>
      </article>

      <footer className="how-story-footer">
        <Link className="brand" href="/" aria-label="Ideator, início">
          <span className="brand-mark">i.</span>
          <span>ideator<span className="brand-dot">.</span></span>
        </Link>
      </footer>
    </main>
  );
}
