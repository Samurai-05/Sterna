import Link from 'next/link';

const githubUrl = 'https://github.com/Samurai-05/Sterna';

export default function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-6 md:py-8">
        <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="Sterna home">
          <img
            src="/sterna-logo.svg"
            alt=""
            aria-hidden="true"
            className="h-9 w-9 object-contain transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-black">
            Sterna
          </span>
        </Link>

        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-4 py-2 text-sm font-semibold text-black shadow-sm backdrop-blur-md transition-colors hover:border-black/20 hover:bg-white"
        >
          GitHub
          <span aria-hidden="true" className="text-black/45 transition-transform group-hover:translate-x-0.5">
            ↗
          </span>
        </a>
      </div>
    </header>
  );
}
