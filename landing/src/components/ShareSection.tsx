import Image from 'next/image';

export default function ShareSection() {
  return (
    <section id="share" className="bg-white py-14 md:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
        <div className="relative order-2 flex justify-center md:order-1 md:justify-start">
          <div className="absolute inset-x-[18%] bottom-[8%] top-[8%] rounded-[32px] bg-primary/[0.07]" />
          <Image
            src="/assets/screenshots/current/groups.png"
            alt="Sterna groups screen with shared maps"
            width={390}
            height={844}
            loading="lazy"
            decoding="async"
            className="relative h-auto w-full max-w-[390px] select-none rounded-[30px] drop-shadow-[0_24px_46px_rgba(0,0,0,0.15)]"
          />
        </div>

        <div className="order-1 max-w-lg md:order-2">
          <p className="font-display text-sm font-medium tracking-[-0.01em] text-primary">Shared exploration</p>
          <h2 className="font-display mt-4 text-balance text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.065em] text-black sm:text-6xl">
            Exploring together? Build the map together.
          </h2>
          <div className="mt-5 space-y-3 text-base leading-7 text-black/50 sm:text-lg sm:leading-8">
            <p>Create a group for the trip and let everyone add discoveries to the same map.</p>
            <p>Each place stays connected to the person who shared it.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
