'use client';

import { useEffect, useRef, useState } from 'react';

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
    description: 'Places, mapped.',
    image: '/mockups/alpes-adventure.png',
  },
  {
    id: 'explore',
    label: 'Explore',
    description: 'Saved places.',
    image: '/mockups/collection.png',
  },
  {
    id: 'add',
    label: 'Add',
    description: 'Save a photo.',
    image: '/mockups/new-discovery.png',
  },
  {
    id: 'groups',
    label: 'Groups',
    description: 'Travel together.',
    image: '/mockups/groups.png',
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Your travel record.',
    image: '/mockups/profile.png',
  },
];

export default function ProductShowcase() {
  const [activeId, setActiveId] = useState<ScreenId>('map');
  const pausedUntilRef = useRef(0);
  const activeScreen = screens.find((screen) => screen.id === activeId) ?? screens[0];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const intervalId = window.setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;

      setActiveId((currentId) => {
        const currentIndex = screens.findIndex((screen) => screen.id === currentId);
        return screens[(currentIndex + 1) % screens.length].id;
      });
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, []);

  const selectScreen = (id: ScreenId) => {
    pausedUntilRef.current = Date.now() + 8000;
    setActiveId(id);
  };

  return (
    <section id="inside-sterna" className="border-y border-black/[0.08] bg-[#f8faf8] py-8 md:py-12">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Explore the app</p>
          <h2 className="font-display mt-2 text-balance text-4xl font-semibold leading-[0.95] tracking-[-0.06em] text-black sm:text-[3.25rem]">
            A closer look at Sterna.
          </h2>
          <p className="mx-auto mt-2 text-sm leading-6 text-black/50 sm:text-base">
            Move through the screens behind your trips, discoveries and shared maps.
          </p>
        </div>

        <div className="mx-auto mt-6 grid max-w-4xl items-stretch gap-5 md:mt-8 md:grid-cols-[minmax(0,1fr)_minmax(230px,0.7fr)] md:gap-12 lg:gap-16">
          <div
            id="app-preview-panel"
            role="tabpanel"
            aria-labelledby={`${activeScreen.id}-tab`}
            className="relative flex min-h-[450px] items-end justify-center sm:min-h-[520px] md:min-h-[585px]"
          >
            <div className="pointer-events-none absolute bottom-[14%] left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[52px]" />
            <img
              src={activeScreen.image}
              alt={`Sterna ${activeScreen.label} screen`}
              width="971"
              height="1619"
              loading="lazy"
              decoding="async"
              className="relative h-auto w-full max-w-[310px] select-none drop-shadow-[0_20px_38px_rgba(0,0,0,0.13)] sm:max-w-[335px] md:max-w-[350px]"
            />
          </div>

          <div className="flex flex-col border-l border-black/[0.09] pl-4 sm:pl-6 md:min-h-[585px] md:self-stretch" role="tablist" aria-label="Sterna app screens" aria-orientation="vertical">
            {screens.map((screen) => {
              const isActive = activeId === screen.id;

              return (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => selectScreen(screen.id)}
                  role="tab"
                  id={`${screen.id}-tab`}
                  aria-controls="app-preview-panel"
                  aria-selected={isActive}
                  className={`relative block w-full border-l-2 py-2.5 pl-4 pr-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 md:flex md:flex-1 md:flex-col md:justify-center md:py-0 ${
                    isActive
                      ? 'border-primary bg-primary/[0.06] text-black'
                      : 'border-transparent text-black/45 hover:border-primary/25 hover:text-black/75'
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">{screen.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-black/45">{screen.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
