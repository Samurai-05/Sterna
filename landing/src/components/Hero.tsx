import Image from 'next/image';
import { FaAndroid, FaGithub } from 'react-icons/fa';

import GlobePolaroids from './GlobePolaroids';

const githubUrl = 'https://github.com/Samurai-05/Sterna';
const androidDownloadUrl = 'https://github.com/Samurai-05/Sterna/releases/latest/download/Sterna.apk';

export default function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden bg-white pt-16 md:pt-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] opacity-70 [background-image:linear-gradient(to_right,rgba(17,17,17,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.045)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-4xl pb-4 text-center md:pb-8">
          <h1 className="font-display text-balance text-5xl font-semibold leading-[0.94] tracking-[-0.065em] text-black sm:text-6xl md:text-7xl lg:text-[88px]">
            Explore the world
            <br />
            with <span className="text-primary">Sterna.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-black/55 sm:text-lg">
            Turn the places you visit into a map of your exploration.
          </p>

          <div className="mt-7 flex flex-col items-center gap-4">
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2.5 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(45,90,61,0.20)] transition-all hover:-translate-y-0.5 hover:bg-primary-accent hover:shadow-[0_14px_34px_rgba(45,90,61,0.26)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
              >
                <FaGithub className="h-4 w-4" aria-hidden="true" />
                Star us on GitHub
              </a>
              <a
                href={androidDownloadUrl}
                className="group inline-flex min-h-12 items-center gap-2.5 rounded-full border border-primary/20 bg-white px-6 py-3.5 text-sm font-semibold text-primary shadow-[0_8px_24px_rgba(45,90,61,0.08)] transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[0.04] hover:shadow-[0_12px_30px_rgba(45,90,61,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
              >
                <FaAndroid className="h-4 w-4" aria-hidden="true" />
                Download for Android
              </a>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white/80 px-3 py-2.5 text-left shadow-[0_8px_24px_rgba(0,0,0,0.04)] backdrop-blur-sm sm:gap-4 sm:px-4 sm:py-3">
              <a
                href={androidDownloadUrl}
                aria-label="Open the Sterna Android download"
                className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2"
              >
                <Image
                  src="/assets/sterna-android-qr.svg"
                  alt="QR code for the Sterna Android download"
                  width={96}
                  height={96}
                  className="h-20 w-20 sm:h-24 sm:w-24"
                />
              </a>
              <div className="max-w-[180px]">
                <p className="text-sm font-semibold text-black">Get Sterna on Android</p>
                <p className="mt-1 text-xs leading-5 text-black/50">Scan to open the latest APK download.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto -mb-[1%] max-w-[1080px]">
          <GlobePolaroids />
          <p className="relative -mt-2 pb-5 text-center text-xs font-medium tracking-[0.02em] text-black/40">
            Drag to explore
          </p>
        </div>
      </div>
    </section>
  );
}
