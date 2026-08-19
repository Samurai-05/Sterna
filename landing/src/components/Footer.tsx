const githubUrl = 'https://github.com/Samurai-05/Sterna';

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-black/55 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Sterna · HEIG-VD</p>
        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-md font-medium text-black/65 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
