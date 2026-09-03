import Image from 'next/image';

export default function WeekendParisMockup() {
  return (
    <section aria-label="Weekend in Paris example" className="overflow-hidden border-y border-black/[0.08] bg-[#f8faf8] py-14 md:py-20 lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:gap-10 lg:gap-12">
        <div className="relative z-10 max-w-xl">
          <p className="font-display text-sm font-medium tracking-[-0.01em] text-primary">Weekend in Paris</p>

          <h2 className="font-display mt-4 text-balance text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.065em] text-black sm:text-6xl lg:text-7xl">
            One weekend. Every discovery in its place.
          </h2>

          <p className="mt-5 max-w-lg text-base leading-7 text-black/50 sm:text-lg sm:leading-8">
            See a trip as a collection of moments, each one tied to the place where it happened.
          </p>
        </div>

        <div className="relative flex min-h-[470px] items-center justify-center md:min-h-[540px] md:justify-end lg:min-h-[620px]">
          <Image
            src="/assets/screenshots/current/discovery-detail.png"
            alt="Sterna discovery detail for Paris from the river"
            width={390}
            height={844}
            loading="eager"
            decoding="async"
            draggable="false"
            className="block h-auto w-full max-w-[390px] select-none rounded-[30px] object-contain drop-shadow-[0_26px_40px_rgba(0,0,0,0.16)] sm:max-w-[390px] md:max-w-[430px]"
          />
        </div>
      </div>
    </section>
  );
}
