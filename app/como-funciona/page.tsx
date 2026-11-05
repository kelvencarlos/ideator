import Link from "next/link";

export const metadata = {
  title: "Como funciona — ideator.",
  description: "Entenda como encontrar pessoas e construir projetos juntos no Ideator.",
};

const steps = [
  {
    title: "Explore ideias",
    text: "Veja projetos de estudantes de diferentes instituições. Você pode buscar por tema, habilidade ou instituição e encontrar algo que tenha a ver com você.",
  },
  {
    title: "Compartilhe o que quer criar",
    text: "Tem uma ideia? Conte qual problema ela resolve, diga de qual instituição você faz parte e escolha as pessoas que gostaria de ter por perto.",
  },
  {
    title: "Peça para participar",
    text: "Encontrou um projeto que combina com você? Envie um pedido e conte quando pode colaborar. O criador avalia cada pedido antes de formar o grupo.",
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
            <span className="how-story-kicker">COMO FUNCIONA</span>
            <h1>Uma ideia não precisa nascer pronta. Só precisa encontrar por onde começar.</h1>
            <p className="how-story-lede">
              Eu criei o Ideator para aproximar estudantes que querem tirar uma ideia do papel,
              mas ainda não encontraram as pessoas certas para fazer isso junto.
            </p>
            <p className="how-story-byline">Kelven Carlos <span>·</span> criador do Ideator</p>
          </div>

          <div className="how-story-art" role="img" aria-label="Uma ideia encontrando pessoas para se tornar um projeto">
            <div className="story-art-label">UMA IDEIA PODE COMEÇAR AQUI</div>
            <div className="story-orbit story-orbit-a" />
            <div className="story-orbit story-orbit-b" />
            <div className="story-idea">uma ideia<br /><em>em movimento</em></div>
            <div className="story-person story-person-one"><span>KC</span><small>produto</small></div>
            <div className="story-person story-person-two"><span>ML</span><small>tecnologia</small></div>
            <div className="story-person story-person-three"><span>AR</span><small>design</small></div>
            <div className="story-art-caption">PESSOAS DIFERENTES. VONTADE EM COMUM.</div>
          </div>
        </section>

        <section className="how-story-body">
          <aside className="how-story-aside">
            <span>O começo</span>
            <p>Uma ideia, um projeto e gente disposta a construir junto.</p>
          </aside>
          <div className="how-story-copy">
            <section>
              <h2>Por que eu fiz o Ideator</h2>
              <p>
                Eu sou estudante de Ciência da Computação e sei como é ter vontade de criar algo
                e não saber quem chamar. Às vezes, falta alguém que entenda de tecnologia. Em
                outras, alguém que pense no produto, no design ou no problema por outro ângulo.
              </p>
              <p>
                O Ideator nasceu para deixar esse primeiro encontro mais fácil. Aqui, você pode
                encontrar projetos de estudantes de outras instituições, mostrar o que quer
                construir e conhecer pessoas que também estão procurando uma oportunidade para
                aprender fazendo.
              </p>
              <p>
                Para publicar uma ideia ou pedir para entrar em um projeto, é só entrar com sua
                conta Google. No projeto, aparecem seu nome, sua instituição e seu curso para
                que a comunidade saiba quem está chegando.
              </p>
            </section>

            <section>
              <h2>Um jeito simples de começar</h2>
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
              <h2>O projeto continua sendo de quem constrói</h2>
              <p>
                Quem publica escolhe quantas pessoas quer receber, quais habilidades procura e
                em quais dias ou períodos o grupo pode trabalhar. As vagas são para quem entrar;
                quem criou a ideia não ocupa uma delas.
              </p>
              <p>
                Quando você pede para participar, o criador recebe seu pedido e decide se faz
                sentido seguir junto. Você pode demonstrar interesse em mais de um projeto,
                mas só pode participar de um por vez. Quando um pedido é aceito, os outros
                pedidos pendentes são cancelados e você fica livre para se dedicar àquele grupo.
                Se você criou um projeto, ele já conta como sua participação.
              </p>
              <p>
                O link do grupo só aparece depois que o criador aceita seu pedido. Assim, todo
                mundo sabe quem está chegando e pode combinar os próximos passos com calma.
              </p>
            </section>

            <section className="how-story-last">
              <h2>Você não precisa ter todas as respostas</h2>
              <p>
                Pode chegar com uma ideia ainda no começo, com uma habilidade que quer praticar
                ou só com vontade de fazer parte de algo. O importante é encontrar pessoas com
                quem a conversa possa virar projeto.
              </p>
              <Link className="how-story-cta" href="/#explorar">Ver projetos da comunidade</Link>
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
