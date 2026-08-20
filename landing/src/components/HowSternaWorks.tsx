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
    <section id="how-it-works" className="bg-white py-20 md:py-28 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">How Sterna works</p>
          <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.05em] text-black sm:text-5xl">
            From a moment to a place on your map.
          </h2>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl space-y-12 md:mt-20 md:space-y-6">
          <div className="absolute bottom-20 left-1/2 top-20 hidden w-px -translate-x-1/2 bg-black/[0.08] md:block" />

          {steps.map((step, index) => {
            const isReversed = index % 2 === 1;

            return (
              <article key={step.title} className="relative grid items-center gap-8 md:grid-cols-2 md:gap-16">
                <div className={`relative z-10 max-w-md ${isReversed ? 'md:order-2 md:justify-self-end' : 'md:justify-self-start'}`}>
                  <p className="text-xs font-semibold tracking-[0.18em] text-primary">{step.number}</p>
                  <h3 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-black sm:text-4xl">{step.title}</h3>
                  <p className="mt-4 text-base leading-7 text-black/50 sm:text-lg">{step.description}</p>
                </div>

                <div className={`relative z-10 flex ${isReversed ? 'md:order-1 md:justify-start' : 'md:justify-end'}`}>
                  <img
                    src={step.image}
                    alt={step.alt}
                    width="971"
                    height="1619"
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-[220px] select-none drop-shadow-[0_24px_46px_rgba(0,0,0,0.14)] sm:w-[250px]"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
