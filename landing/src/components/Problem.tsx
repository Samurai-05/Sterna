import Image from 'next/image';

export default function Problem() {
  return (
    <section id="why-sterna" className="border-t border-black/[0.08] bg-[#f8faf8] py-14 md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-12">
        <div className="max-w-xl">
          <p className="font-display text-sm font-medium tracking-[-0.01em] text-primary">Why Sterna</p>
          <h2 className="font-display mt-4 text-balance text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.065em] text-black sm:text-6xl lg:text-[68px]">
            Your travel memories are scattered across your camera roll.
          </h2>
          <div className="mt-5 space-y-3 text-base leading-7 text-black/50 sm:text-lg sm:leading-8">
            <p>Photos hold on to individual moments, but they rarely show the bigger picture of where those moments happened.</p>
            <p>Sterna turns the places behind your photos into discoveries you can return to on a map.</p>
          </div>
        </div>

        <div className="relative mx-auto h-[400px] w-full max-w-[460px] sm:h-[500px]">
          <div className="absolute inset-x-[8%] bottom-[8%] top-[8%] rounded-[32px] bg-primary/[0.08]" />
          <Image
            src="/assets/mockups/map.webp"
            alt="Sterna map with saved discoveries"
            width={1024}
            height={1536}
            loading="lazy"
            decoding="async"
            className="absolute bottom-0 left-0 z-10 h-auto w-[60%] -rotate-[7deg] select-none drop-shadow-[0_22px_38px_rgba(0,0,0,0.14)]"
          />
          <Image
            src="/assets/mockups/location.webp"
            alt="A travel photo saved as a Sterna discovery"
            width="720"
            height="1200"
            loading="lazy"
            decoding="async"
            className="absolute right-0 top-0 z-20 h-auto w-[64%] rotate-[6deg] select-none drop-shadow-[0_26px_44px_rgba(0,0,0,0.16)]"
          />
        </div>
      </div>
    </section>
  );
}
