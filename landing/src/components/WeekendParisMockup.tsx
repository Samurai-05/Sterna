const details = [
  ['Capture', 'Save a place with a photo and its location.'],
  ['Remember', 'Keep every discovery attached to the trip where it happened.'],
  ['Explore', 'Watch your personal map grow as you keep moving.'],
];

export default function WeekendParisMockup() {
  return (
    <section aria-label="Sterna app preview" className="overflow-hidden bg-white py-20 md:py-28 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:gap-8 lg:gap-16">
        <div className="relative z-10 max-w-xl md:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Your trips, remembered
          </p>

          <h2 className="mt-5 text-balance text-4xl font-bold leading-[0.98] tracking-[-0.055em] text-black sm:text-5xl lg:text-6xl">
            Every place becomes part of your story.
          </h2>

          <p className="mt-6 max-w-lg text-base leading-7 text-black/50 sm:text-lg sm:leading-8">
            Sterna turns the places you visit into a visual travel memory. Add a discovery, place it on the map,
            and come back to the moments that made the trip yours.
          </p>

          <div className="mt-9 border-t border-black/[0.08]">
            {details.map(([title, description]) => (
              <div
                key={title}
                className="grid grid-cols-[88px_1fr] gap-4 border-b border-black/[0.08] py-4 sm:grid-cols-[100px_1fr]"
              >
                <p className="text-sm font-semibold text-black">{title}</p>
                <p className="text-sm leading-6 text-black/45">{description}</p>
              </div>
            ))}
          </div>

          <a
            href="#inside-sterna"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-4"
          >
            Explore the app
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="relative flex min-h-[560px] items-center justify-center md:min-h-[640px] md:justify-end lg:min-h-[700px]">
          <img
            src="/images/mockups/weekend-paris-phone.svg?v=20260819-5"
            alt="Sterna mobile app showing the Weekend Paris map"
            width="430"
            height="932"
            loading="eager"
            decoding="sync"
            draggable="false"
            className="block h-auto w-[300px] rotate-[24deg] select-none drop-shadow-[0_26px_34px_rgba(0,0,0,0.16)] sm:w-[340px] md:-mr-6 md:w-[380px] lg:-mr-8 lg:w-[410px]"
          />
        </div>
      </div>
    </section>
  );
}
