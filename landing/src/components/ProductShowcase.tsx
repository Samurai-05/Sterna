'use client';

import { useEffect, useState } from 'react';
import styles from './ProductShowcase.module.css';

type ScreenId = 'map' | 'gallery' | 'discovery' | 'groups' | 'profile';

type Screen = {
  id: ScreenId;
  label: string;
  description: string;
  image: string;
};

type TransitionDirection = 'up' | 'down';
type ProgressPhase = 'fill' | 'countdown';

const MOCKUP_TRANSITION_DURATION = 320;

const screens: Screen[] = [
  {
    id: 'map',
    label: 'Map',
    description: 'Interactive exploration.',
    image: '/assets/screenshots/current/map-exploration.webp',
  },
  {
    id: 'gallery',
    label: 'Gallery',
    description: 'Discoveries and POIs.',
    image: '/assets/screenshots/current/gallery-2.webp',
  },
  {
    id: 'discovery',
    label: 'Discovery',
    description: 'Details for every place.',
    image: '/assets/screenshots/current/discovery-detail.webp',
  },
  {
    id: 'groups',
    label: 'Groups',
    description: 'Shared maps.',
    image: '/assets/screenshots/current/groups.webp',
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Your exploration.',
    image: '/assets/screenshots/current/profile-statistics.webp',
  },
];

export default function ProductShowcase() {
  const [activeId, setActiveId] = useState<ScreenId>('map');
  const [previousId, setPreviousId] = useState<ScreenId | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('up');
  const [progressPhase, setProgressPhase] = useState<ProgressPhase>('fill');
  const [isProgressReady, setIsProgressReady] = useState(false);
  const activeScreen = screens.find((screen) => screen.id === activeId) ?? screens[0];
  const activeIndex = screens.findIndex((screen) => screen.id === activeScreen.id);
  const previousScreen = previousId ? screens.find((screen) => screen.id === previousId) : null;

  useEffect(() => {
    screens.forEach((screen) => {
      const image = new window.Image();
      image.src = screen.image;
    });
  }, []);

  useEffect(() => {
    setIsProgressReady(true);
  }, []);

  useEffect(() => {
    if (!previousId) return;

    const timeoutId = window.setTimeout(() => setPreviousId(null), MOCKUP_TRANSITION_DURATION);
    return () => window.clearTimeout(timeoutId);
  }, [previousId]);

  const selectScreen = (id: ScreenId) => {
    if (id === activeId) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPreviousId(null);
      setActiveId(id);
      setProgressPhase('fill');
      return;
    }

    const nextIndex = screens.findIndex((screen) => screen.id === id);
    setPreviousId(activeId);
    setTransitionDirection(nextIndex > activeIndex ? 'up' : 'down');
    setActiveId(id);
    setProgressPhase('fill');
  };

  const handleProgressAnimationEnd = () => {
    if (progressPhase === 'fill') {
      setProgressPhase('countdown');
      return;
    }

    const nextIndex = (activeIndex + 1) % screens.length;
    setPreviousId(activeId);
    setTransitionDirection('up');
    setActiveId(screens[nextIndex].id);
    setProgressPhase('fill');
  };

  return (
    <section id="inside-sterna" className="border-y border-black/[0.08] bg-[#f8faf8] py-8 md:py-12">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-display text-sm font-medium tracking-[-0.01em] text-primary">Explore the app</p>
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
            className="relative flex min-h-[550px] items-end justify-center sm:min-h-[590px] md:min-h-[620px]"
          >
            <div className="pointer-events-none absolute bottom-[14%] left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[52px]" />
            {previousScreen && (
              <img
                src={previousScreen.image}
                alt=""
                width={390}
                height={844}
                decoding="async"
                aria-hidden="true"
                className={`phone-mockup phone-mockup--exit-${transitionDirection} absolute bottom-0 left-1/2 z-10 h-auto max-h-[520px] w-full max-w-[240px] select-none rounded-[28px] drop-shadow-[0_20px_38px_rgba(0,0,0,0.13)] sm:max-h-[560px] sm:max-w-[260px] md:max-h-[600px] md:max-w-[280px]`}
              />
            )}
            <img
              key={activeScreen.id}
              src={activeScreen.image}
              alt={`Sterna ${activeScreen.label} screen`}
              width={390}
              height={844}
              loading="lazy"
              decoding="async"
              className={`phone-mockup ${previousScreen ? `phone-mockup--enter-${transitionDirection}` : 'phone-mockup--static'} absolute bottom-0 left-1/2 z-20 h-auto max-h-[520px] w-full max-w-[240px] select-none rounded-[28px] drop-shadow-[0_20px_38px_rgba(0,0,0,0.13)] sm:max-h-[560px] sm:max-w-[260px] md:max-h-[600px] md:max-w-[280px]`}
            />
          </div>

          <div
            className="relative grid h-[320px] grid-rows-5 pl-5 sm:pl-6 md:h-[620px] md:self-stretch"
            role="tablist"
            aria-label="Sterna app screens"
            aria-orientation="vertical"
          >
            <span className="pointer-events-none absolute inset-y-0 left-0 z-0 w-px bg-black/[0.1]" aria-hidden="true" />
            <span
              className="pointer-events-none absolute left-0 top-0 z-20 h-[20%] w-[2px]"
              style={{ transform: `translateY(${activeIndex * 100}%)` }}
              aria-hidden="true"
            >
              {isProgressReady && (
                <span
                  key={`${activeId}-${progressPhase}`}
                  className={progressPhase === 'fill' ? styles.progressFill : styles.progressCountdown}
                  onAnimationEnd={handleProgressAnimationEnd}
                />
              )}
            </span>
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
                  className={`relative flex w-full flex-col justify-center px-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${
                    isActive
                      ? 'bg-primary/[0.05] text-black'
                      : 'text-black/45 hover:text-black/75'
                  }`}
                >
                  <span className="font-display text-sm font-medium tracking-[-0.01em]">{screen.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-black/45">{screen.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .phone-mockup--static {
          transform: translateX(-50%);
        }

        .phone-mockup--enter-up {
          animation: mockup-enter-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .phone-mockup--exit-up {
          animation: mockup-exit-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .phone-mockup--enter-down {
          animation: mockup-enter-down 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .phone-mockup--exit-down {
          animation: mockup-exit-down 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes mockup-enter-up {
          from {
            opacity: 0;
            transform: translate(-50%, 12px);
          }

          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        @keyframes mockup-exit-up {
          from {
            opacity: 1;
            transform: translate(-50%, 0);
          }

          to {
            opacity: 0;
            transform: translate(-50%, -12px);
          }
        }

        @keyframes mockup-enter-down {
          from {
            opacity: 0;
            transform: translate(-50%, -12px);
          }

          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        @keyframes mockup-exit-down {
          from {
            opacity: 1;
            transform: translate(-50%, 0);
          }

          to {
            opacity: 0;
            transform: translate(-50%, 12px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .phone-mockup--enter-up,
          .phone-mockup--exit-up,
          .phone-mockup--enter-down,
          .phone-mockup--exit-down {
            animation: none;
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}
