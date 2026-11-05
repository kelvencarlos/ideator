import Link from "next/link";
import RevealOnScroll from "./RevealOnScroll";
import SectionTitleRail from "./SectionTitleRail";

export const metadata = {
  title: "Como funciona — ideator.",
  description: "Entenda como encontrar pessoas e construir projetos juntos no Ideator.",
};

const flows = [
  {
    title: "Quero participar de um projeto",
    description: "Para quem busca uma iniciativa para contribuir.",
    steps: [
      { title: "Encontre um projeto", text: "Consulte as iniciativas e busque por tema, competência ou instituição." },
      { title: "Envie seu pedido", text: "Informe sua disponibilidade e aguarde a análise do responsável pelo projeto." },
      { title: "Comece a colaborar", text: "Após a aprovação, o link do grupo de WhatsApp fica disponível para você." },
    ],
  },
  {
    title: "Quero criar um projeto",
    description: "Para quem tem uma proposta e procura colaboradores.",
    steps: [
      { title: "Apresente a proposta", text: "Descreva o problema, informe sua instituição e curso e defina as competências, a disponibilidade e as vagas." },
      { title: "Avalie os pedidos", text: "Revise a disponibilidade de cada pessoa e aceite quem fará parte do grupo." },
      { title: "Organize o trabalho", text: "Depois da aprovação, os participantes recebem acesso ao link do grupo de WhatsApp." },
    ],
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
        <RevealOnScroll>
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
        </RevealOnScroll>

        <section className="how-story-body">
          <SectionTitleRail initialTitle="Projetos exigem competências diferentes" />
          <div className="how-story-copy">
            <RevealOnScroll sectionTitle="Projetos exigem competências diferentes">
              <section>
                <h2 className="story-section-heading">Projetos exigem competências diferentes</h2>
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
            </RevealOnScroll>

            <RevealOnScroll sectionTitle="Escolha como quer participar">
              <section>
                <h2 className="story-section-heading">Escolha como quer participar</h2>
                <div className="how-story-flows">
                  {flows.map((flow) => (
                    <article className="how-story-flow" key={flow.title}>
                      <h3>{flow.title}</h3>
                      <p className="flow-description">{flow.description}</p>
                      <ol>
                        {flow.steps.map((step) => (
                          <li key={step.title}>
                            <span className="flow-step-marker" aria-hidden="true" />
                            <div><h4>{step.title}</h4><p>{step.text}</p></div>
                          </li>
                        ))}
                      </ol>
                    </article>
                  ))}
                </div>
              </section>
            </RevealOnScroll>

            <RevealOnScroll sectionTitle="Regras claras para cada projeto">
              <section>
                <h2 className="story-section-heading">Regras claras para cada projeto</h2>
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
            </RevealOnScroll>

            <RevealOnScroll sectionTitle="Encontre um projeto para participar">
              <section className="how-story-last">
                <h2 className="story-section-heading">Encontre um projeto para participar</h2>
                <p>
                  Consulte os projetos publicados e solicite entrada naquele em que pode contribuir.
                  Se você já tem uma proposta, publique e encontre colaboradores.
                </p>
                <Link className="how-story-cta" href="/#explorar">Explorar projetos</Link>
              </section>
            </RevealOnScroll>
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
