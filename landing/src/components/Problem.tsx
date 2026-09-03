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

        <div className="relative mx-auto h-[480px] w-full max-w-[460px] sm:h-[600px]">
          <div className="absolute inset-x-[8%] bottom-[8%] top-[8%] rounded-[32px] bg-primary/[0.08]" />
          <Image
            src="/assets/screenshots/current/map-exploration.webp"
            alt="Sterna interactive exploration map with discoveries and points of interest"
            width={390}
            height={844}
            loading="lazy"
            decoding="async"
            className="absolute bottom-0 left-0 z-10 h-auto w-[50%] -rotate-[7deg] select-none rounded-[28px] drop-shadow-[0_22px_38px_rgba(0,0,0,0.14)]"
          />
          <Image
            src="/assets/screenshots/current/gallery.webp"
            alt="Sterna gallery of geolocated discoveries and points of interest"
            width={390}
            height={844}
            loading="lazy"
            decoding="async"
            className="absolute right-0 top-0 z-20 h-auto w-[54%] rotate-[6deg] select-none rounded-[28px] drop-shadow-[0_26px_44px_rgba(0,0,0,0.16)]"
          />
        </div>
      </div>
    </section>
  );
}
