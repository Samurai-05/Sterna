'use client';

import { useState } from 'react';

type ScreenId = 'map' | 'explore' | 'add' | 'groups' | 'profile';

type Screen = {
  id: ScreenId;
  label: string;
  description: string;
  image: string;
};

const screens: Screen[] = [
  {
    id: 'map',
    label: 'Map',
    description: 'See your discoveries in the places where they happened.',
    image: '/mockups/alpes-adventure.png',
  },
  {
    id: 'explore',
    label: 'Explore',
    description: 'Browse saved discoveries and points of interest.',
    image: '/mockups/collection.png',
  },
  {
    id: 'add',
    label: 'Add',
    description: 'Turn a photo into a discovery for your trip.',
    image: '/mockups/new-discovery.png',
  },
  {
    id: 'groups',
    label: 'Groups',
    description: 'Keep one shared map for the people travelling with you.',
    image: '/mockups/groups.png',
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Look back on the places and trips you have collected.',
    image: '/mockups/profile.png',
  },
];

export default function ProductShowcase() {
  const [activeId, setActiveId] = useState<ScreenId>('map');
  const activeScreen = screens.find((screen) => screen.id === activeId) ?? screens[0];

  return (
    <section id="inside-sterna" className="border-y border-black/[0.08] bg-[#f8faf8] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Explore the app</p>
          <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.05em] text-black sm:text-5xl">
            A closer look at Sterna.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-black/50 sm:text-lg">
            Move through the screens behind your trips, discoveries and shared maps.
          </p>
        </div>

        <div className="mt-9 flex flex-wrap justify-center gap-1.5 rounded-2xl border border-black/[0.07] bg-white p-1.5 shadow-sm md:mx-auto md:w-fit">
          {screens.map((screen) => (
            <button
              key={screen.id}
              type="button"
              onClick={() => setActiveId(screen.id)}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${
                activeId === screen.id ? 'bg-primary text-white' : 'text-black/45 hover:bg-black/[0.035] hover:text-black/70'
              }`}
            >
              {screen.label}
            </button>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-[32px] border border-black/[0.07] bg-white px-5 pt-8 shadow-[0_22px_70px_rgba(0,0,0,0.045)] sm:px-10 md:mt-10 md:pt-10">
          <div className="mx-auto max-w-md text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{activeScreen.label}</p>
            <p className="mt-3 text-sm leading-6 text-black/50 sm:text-base">{activeScreen.description}</p>
          </div>

          <div className="relative mx-auto mt-8 flex min-h-[470px] max-w-xl items-end justify-center sm:min-h-[560px]">
            <div className="pointer-events-none absolute bottom-[12%] left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-primary/[0.1] blur-[70px]" />
            <img
              src={activeScreen.image}
              alt={`Sterna ${activeScreen.label} screen`}
              width="971"
              height="1619"
              loading="lazy"
              decoding="async"
              className="relative h-auto w-[285px] select-none drop-shadow-[0_24px_50px_rgba(0,0,0,0.16)] sm:w-[335px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
