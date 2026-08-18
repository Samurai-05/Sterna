import { FaGithub } from 'react-icons/fa';

import GlobePolaroids from './GlobePolaroids';

const githubUrl = 'https://github.com/Samurai-05/Sterna';

export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden bg-white pt-16 md:pt-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] opacity-70 [background-image:linear-gradient(to_right,rgba(17,17,17,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.045)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-4xl pb-4 text-center md:pb-8">
          <h1 className="text-balance text-5xl font-extrabold leading-[0.94] tracking-[-0.055em] text-black sm:text-6xl md:text-7xl lg:text-[88px]">
            Explore the world
            <br />
            with <span className="text-primary">Sterna.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-black/55 sm:text-lg">
            Save the places you visit and watch your map reveal itself, one exploration at a time.
          </p>

          <div className="mt-7 flex justify-center">
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(252,82,0,0.22)] transition-all hover:-translate-y-0.5 hover:bg-primary-accent hover:shadow-[0_14px_34px_rgba(252,82,0,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
            >
              <FaGithub className="h-4 w-4" aria-hidden="true" />
              Star us on GitHub
            </a>
          </div>
        </div>

        <div className="relative mx-auto -mb-[1%] max-w-[1080px]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[48%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(252,82,0,0.08)] blur-[90px]" />
          <GlobePolaroids />
          <p className="relative -mt-2 pb-5 text-center text-xs font-medium tracking-[0.02em] text-black/40">
            Drag to explore
          </p>
        </div>
      </div>
    </section>
  );
}
