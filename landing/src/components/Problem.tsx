export default function Problem() {
  return (
    <section id="why-sterna" className="border-t border-black/[0.08] bg-[#f8faf8] py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Why Sterna</p>
          <h2 className="mt-5 text-balance text-4xl font-bold leading-[0.98] tracking-[-0.05em] text-black sm:text-5xl">
            Your travel memories are scattered across your camera roll.
          </h2>
          <div className="mt-6 space-y-4 text-base leading-7 text-black/50 sm:text-lg sm:leading-8">
            <p>Photos hold on to individual moments, but they rarely show the bigger picture of where those moments happened.</p>
            <p>Sterna turns the places behind your photos into discoveries you can return to on a map.</p>
          </div>
        </div>

        <div className="relative mx-auto h-[430px] w-full max-w-[460px] sm:h-[510px]">
          <div className="absolute inset-x-[8%] bottom-[8%] top-[8%] rounded-[32px] bg-primary/[0.08]" />
          <img
            src="/mockups/alpes-adventure.png"
            alt="Sterna map with saved discoveries"
            width="971"
            height="1619"
            loading="lazy"
            decoding="async"
            className="absolute bottom-0 left-[2%] z-10 h-auto w-[50%] -rotate-[7deg] select-none drop-shadow-[0_22px_38px_rgba(0,0,0,0.14)]"
          />
          <img
            src="/mockups/location.png"
            alt="A travel photo saved as a Sterna discovery"
            width="971"
            height="1619"
            loading="lazy"
            decoding="async"
            className="absolute right-[2%] top-0 z-20 h-auto w-[53%] rotate-[6deg] select-none drop-shadow-[0_26px_44px_rgba(0,0,0,0.16)]"
          />
        </div>
      </div>
    </section>
  );
}
