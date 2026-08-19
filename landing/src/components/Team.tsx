import { FaGithub, FaUser } from 'react-icons/fa';

type Member = {
  name: string;
  role: string;
  email: string;
  github: string;
  githubHandle: string;
  image?: string;
};

const members: Member[] = [
  {
    name: 'Victor Giordani',
    role: 'Data Science',
    email: 'victor.giordani@heig-vd.ch',
    github: 'https://github.com/VictorGTheCoder',
    githubHandle: '@VictorGTheCoder',
  },
  {
    name: 'Abram Zweifel',
    role: 'Data Science',
    email: 'abram.zweifel@heig-vd.ch',
    github: 'https://github.com/Abram0303',
    githubHandle: '@Abram0303',
  },
  {
    name: 'Romain Durussel',
    role: 'Data Science',
    email: 'romain.durussel@heig-vd.ch',
    github: 'https://github.com/romain-drsl',
    githubHandle: '@romain-drsl',
  },
  {
    name: 'Samuel Dos Santos',
    role: 'Networks',
    email: 'samuel.dos-santos@heig-vd.ch',
    github: 'https://github.com/Samurai-05',
    githubHandle: '@Samurai-05',
  },
];

function HeigMark() {
  return (
    <svg
      viewBox="0 0 64 44"
      className="h-[18px] w-[24px] shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="#e5251b">
        <path d="M0 0h4v7h11V0h4v18h-4v-7H4v7H0V0Z" />
        <path d="M23 0h18v4H27v3h12v4H27v3h14v4H23V0Z" />
        <path d="M0 24h19v4h-7.5v12H19v4H0v-4h7.5V28H0v-4Z" />
        <path d="M23 24h18v4H27v12h10v-4h-6v-4h10v12H23V24Z" />
        <path d="M44 1h2.6l2.7 7 2.7-7h2.6l-4.1 10h-2.4L44 1Z" />
        <path d="M56 1h3.4C62.4 1 64 2.8 64 6s-1.6 5-4.6 5H56V1Zm2.2 2v6h1.1c1.6 0 2.5-1 2.5-3s-.9-3-2.5-3h-1.1Z" />
      </g>
    </svg>
  );
}

export default function Team() {
  return (
    <section id="team" className="border-t border-black/10 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mb-10 md:mb-14">
          <h2 className="max-w-xl text-3xl font-bold tracking-[-0.03em] text-black md:text-4xl">
            Built by four students at HEIG-VD.
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {members.map((member) => (
            <article
              key={member.email}
              className="group rounded-2xl border border-black/10 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_12px_32px_rgba(0,0,0,0.05)] md:p-6"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-[#fafafa] bg-cover bg-center transition-colors duration-200 group-hover:border-primary/30 group-hover:bg-primary/[0.04]"
                  style={member.image ? { backgroundImage: `url(${member.image})` } : undefined}
                  role={member.image ? 'img' : undefined}
                  aria-label={member.image ? member.name : undefined}
                >
                  {!member.image && (
                    <FaUser className="h-[18px] w-[18px] text-black/30 transition-colors duration-200 group-hover:text-primary/60" aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold leading-tight text-black">{member.name}</h3>
                  <p className="mt-1 text-[13px] text-black/55">{member.role}</p>
                </div>
              </div>

              <div className="mt-6 space-y-0.5 border-t border-black/[0.07] pt-3">
                <a
                  href={`mailto:${member.email}`}
                  className="-mx-1.5 flex min-h-10 min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-xs text-black/60 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1"
                >
                  <HeigMark />
                  <span className="min-w-0 truncate">{member.email}</span>
                </a>

                <a
                  href={member.github}
                  target="_blank"
                  rel="noreferrer"
                  className="-mx-1.5 flex min-h-10 items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-xs font-medium text-black/60 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-1"
                >
                  <FaGithub className="h-[17px] w-[17px] shrink-0 text-black/75" aria-hidden="true" />
                  <span>{member.githubHandle}</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
