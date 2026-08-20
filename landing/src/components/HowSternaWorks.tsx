const steps = [
  {
    number: '01',
    title: 'Capture',
    description: 'Take a photo or choose one from your gallery when you find a place worth remembering.',
    image: '/mockups/new-discovery.png',
    alt: 'Sterna screen for creating a new discovery',
  },
  {
    number: '02',
    title: 'Locate',
    description: 'Confirm where it happened, then adjust the place when the photo needs a little help.',
    image: '/mockups/location.png',
    alt: 'Sterna location screen for a saved discovery',
  },
  {
    number: '03',
    title: 'Reveal',
    description: 'Save the discovery to your trip and see it become part of your personal map.',
    image: '/mockups/alpes-adventure.png',
    alt: 'Sterna map showing saved discoveries',
  },
];

export default function HowSternaWorks() {
  return (
    <section id="how-it-works" className="bg-white py-14 md:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-sm font-medium tracking-[-0.01em] text-primary">How Sterna works</p>
          <h2 className="font-display mt-4 text-balance text-[2.75rem] font-semibold leading-[0.95] tracking-[-0.065em] text-black sm:text-6xl md:text-7xl">
            From a moment to a place on your map.
          </h2>
        </div>

        <div className="mx-auto mt-10 max-w-6xl md:mt-12">
          <div className="hidden grid-cols-3 md:grid" aria-hidden="true">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex h-10 items-center justify-center">
                {index > 0 && <span className="absolute left-0 top-1/2 h-px w-1/2 -translate-y-1/2 bg-black/[0.1]" />}
                {index < steps.length - 1 && <span className="absolute right-0 top-1/2 h-px w-1/2 -translate-y-1/2 bg-black/[0.1]" />}
                <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-white text-xs font-bold text-primary shadow-sm">
                  {step.number}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-10 md:grid-cols-3 md:gap-0">
            {steps.map((step) => (
              <article key={step.title} className="relative flex flex-col items-center text-center md:px-4 md:items-start md:text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-white text-xs font-bold text-primary shadow-sm md:hidden">
                  {step.number}
                </span>
                <h3 className="font-display mt-4 text-3xl font-semibold tracking-[-0.055em] text-black sm:text-4xl">{step.title}</h3>
                <p className="mt-3 max-w-sm text-base leading-7 text-black/50">{step.description}</p>
                <img
                  src={step.image}
                  alt={step.alt}
                  width="971"
                  height="1619"
                  loading="lazy"
                  decoding="async"
                  className="mt-6 h-auto w-full max-w-[300px] select-none drop-shadow-[0_24px_46px_rgba(0,0,0,0.14)]"
                />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
