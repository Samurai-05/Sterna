export default function WeekendParisMockup() {
  return (
    <section aria-label="Weekend in Paris example" className="overflow-hidden border-y border-black/[0.08] bg-[#f8faf8] py-20 md:py-28 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:gap-8 lg:gap-16">
        <div className="relative z-10 max-w-xl md:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Weekend in Paris</p>

          <h2 className="mt-5 text-balance text-4xl font-bold leading-[0.98] tracking-[-0.055em] text-black sm:text-5xl lg:text-6xl">
            One weekend. One map. Every discovery in its place.
          </h2>

          <p className="mt-6 max-w-lg text-base leading-7 text-black/50 sm:text-lg sm:leading-8">
            See a trip as a collection of moments, each one tied to the place where it happened.
          </p>
        </div>

        <div className="relative flex min-h-[520px] items-center justify-center md:min-h-[620px] md:justify-end lg:min-h-[680px]">
          <img
            src="/mockups/weekend-paris.png"
            alt="Sterna mobile app showing the Weekend Paris map"
            width="1024"
            height="1536"
            loading="eager"
            decoding="async"
            draggable="false"
            className="block h-auto w-[330px] select-none object-contain drop-shadow-[0_26px_40px_rgba(0,0,0,0.16)] sm:w-[370px] md:-mr-6 md:w-[410px] lg:-mr-8 lg:w-[450px]"
          />
        </div>
      </div>
    </section>
  );
}
