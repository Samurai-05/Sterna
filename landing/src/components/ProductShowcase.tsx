'use client';

import { useState } from 'react';
import {
  FaCamera,
  FaCompass,
  FaImage,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaPlus,
  FaUser,
  FaUsers,
} from 'react-icons/fa';

type FeatureId = 'map' | 'explore' | 'add' | 'groups' | 'profile';

type Feature = {
  id: FeatureId;
  label: string;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    id: 'map',
    label: 'Map',
    title: "See where you've been.",
    description:
      'Your discoveries live on an interactive map, while visited countries gradually reveal your exploration of the world.',
  },
  {
    id: 'explore',
    label: 'Explore',
    title: 'Find your next discovery.',
    description:
      'Browse places and points of interest around the map, then keep moving toward what you have not explored yet.',
  },
  {
    id: 'add',
    label: 'Add',
    title: 'Save a moment in seconds.',
    description:
      'Take or import a photo, confirm its location and turn it into a geolocated discovery without a long form to complete.',
  },
  {
    id: 'groups',
    label: 'Groups',
    title: 'Explore together.',
    description:
      'Create a shared map with friends and bring everyone’s discoveries from the same trip into one place.',
  },
  {
    id: 'profile',
    label: 'Profile',
    title: 'Track your journey.',
    description:
      'Follow your visited countries, discoveries and simple exploration statistics as your map grows over time.',
  },
];

const navItems = [
  { id: 'map' as FeatureId, label: 'Map', icon: FaMapMarkedAlt },
  { id: 'explore' as FeatureId, label: 'Explore', icon: FaCompass },
  { id: 'add' as FeatureId, label: 'Add', icon: FaPlus },
  { id: 'groups' as FeatureId, label: 'Groups', icon: FaUsers },
  { id: 'profile' as FeatureId, label: 'Profile', icon: FaUser },
];

function MiniPin({ className = '' }: { className?: string }) {
  return (
    <span
      className={`absolute flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-primary text-white shadow-[0_5px_14px_rgba(0,0,0,0.16)] ${className}`}
    >
      <FaMapMarkerAlt className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

function MapScreen() {
  return (
    <div className="relative h-full bg-[#edf1ec]">
      <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(to_right,rgba(45,90,61,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(45,90,61,0.08)_1px,transparent_1px)] [background-size:38px_38px]" />
      <div className="absolute left-5 right-5 top-5 rounded-2xl border border-black/[0.06] bg-white/95 p-3 shadow-sm backdrop-blur">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-black/40">Your exploration</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-lg font-bold tracking-[-0.03em] text-black">8 countries</p>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">24 discoveries</span>
        </div>
      </div>

      <div className="absolute left-[12%] top-[35%] h-24 w-32 rotate-[-8deg] rounded-[45%] bg-primary/[0.16]" />
      <div className="absolute right-[8%] top-[48%] h-28 w-24 rotate-[14deg] rounded-[46%] bg-primary/[0.12]" />
      <div className="absolute bottom-[20%] left-[30%] h-16 w-28 rotate-[7deg] rounded-[48%] bg-white/70" />

      <MiniPin className="left-[24%] top-[45%]" />
      <MiniPin className="right-[20%] top-[55%]" />
      <MiniPin className="bottom-[28%] left-[49%]" />
    </div>
  );
}

function ExploreScreen() {
  const places = [
    { title: 'Château de Chillon', meta: 'Heritage · 18 km', symbol: '🏰' },
    { title: 'Lavaux terraces', meta: 'Landscape · 31 km', symbol: '⛰' },
    { title: 'Creux du Van', meta: 'Landscape · 72 km', symbol: '🌿' },
  ];

  return (
    <div className="h-full bg-[#f7f8f6] p-4 pt-5">
      <div className="rounded-xl border border-black/[0.07] bg-white px-3 py-2.5 text-xs text-black/35 shadow-sm">Search a place...</div>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">Nearby discoveries</p>
      <div className="mt-2.5 space-y-2.5">
        {places.map((place) => (
          <div key={place.title} className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/[0.08] text-xl">{place.symbol}</div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-black">{place.title}</p>
              <p className="mt-1 text-[10px] text-black/40">{place.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddScreen() {
  return (
    <div className="flex h-full flex-col bg-[#f7f8f6] p-4 pt-6">
      <p className="text-lg font-bold tracking-[-0.03em] text-black">Add a discovery</p>
      <p className="mt-1 text-[11px] leading-4 text-black/45">Start with a photo. Sterna will help you place it on the map.</p>

      <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-primary/30 bg-primary/[0.04] px-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_rgba(45,90,61,0.2)]">
          <FaCamera className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-semibold text-black">Take a photo</p>
        <p className="mt-1 text-[10px] leading-4 text-black/40">or choose one from your gallery</p>
        <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-2 text-[10px] font-semibold text-black/65 shadow-sm">
          <FaImage className="h-3 w-3" aria-hidden="true" />
          Open gallery
        </button>
      </div>
    </div>
  );
}

function GroupsScreen() {
  return (
    <div className="h-full bg-[#f7f8f6] p-4 pt-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium text-black/40">Shared map</p>
          <p className="text-base font-bold tracking-[-0.03em] text-black">Italy roadtrip</p>
        </div>
        <div className="flex -space-x-2">
          {['A', 'L', 'M', 'J'].map((initial) => (
            <div key={initial} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary text-[9px] font-semibold text-white">
              {initial}
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-4 h-[58%] overflow-hidden rounded-2xl border border-black/[0.06] bg-[#e9eee8]">
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(45,90,61,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(45,90,61,0.08)_1px,transparent_1px)] [background-size:30px_30px]" />
        <MiniPin className="left-[18%] top-[30%]" />
        <MiniPin className="right-[22%] top-[38%]" />
        <MiniPin className="bottom-[20%] left-[48%]" />
        <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <p className="text-[10px] font-semibold text-black">Pisa</p>
          <p className="mt-0.5 text-[9px] text-black/40">Added by Luca · Today</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-black/[0.06] bg-white px-3 py-2.5">
        <span className="text-[10px] font-medium text-black/55">18 shared discoveries</span>
        <span className="text-[10px] font-semibold text-primary">View group</span>
      </div>
    </div>
  );
}

function ProfileScreen() {
  return (
    <div className="h-full bg-[#f7f8f6] p-4 pt-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">V</div>
        <div>
          <p className="text-sm font-bold text-black">Victor</p>
          <p className="text-[10px] text-black/40">Explorer since 2026</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {[
          ['8', 'Countries'],
          ['24', 'Discoveries'],
          ['6', 'Categories'],
          ['3', 'Groups'],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-black/[0.06] bg-white p-3 shadow-sm">
            <p className="text-lg font-bold tracking-[-0.04em] text-black">{value}</p>
            <p className="mt-0.5 text-[9px] text-black/40">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-black">Exploration progress</p>
          <p className="text-[10px] font-semibold text-primary">32%</p>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-black/[0.06]">
          <div className="h-full w-[32%] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

function PhonePreview({ active }: { active: FeatureId }) {
  return (
    <div className="relative mx-auto w-full max-w-[520px] py-3 md:py-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.12] blur-[70px]" />
      <div className="relative mx-auto w-[250px] rounded-[36px] border border-black/10 bg-[#111] p-[6px] shadow-[0_24px_70px_rgba(0,0,0,0.16)] sm:w-[280px]">
        <div className="relative aspect-[9/18.8] overflow-hidden rounded-[30px] bg-[#f7f8f6]">
          <div className="absolute left-1/2 top-2 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-black" />
          <div className="absolute inset-x-0 bottom-[58px] top-0 pt-6">
            {active === 'map' && <MapScreen />}
            {active === 'explore' && <ExploreScreen />}
            {active === 'add' && <AddScreen />}
            {active === 'groups' && <GroupsScreen />}
            {active === 'profile' && <ProfileScreen />}
          </div>

          <nav className="absolute inset-x-0 bottom-0 z-30 grid h-[58px] grid-cols-5 border-t border-black/[0.06] bg-white/95 px-1 backdrop-blur">
            {navItems.map(({ id, label, icon: Icon }) => {
              const isActive = active === id;
              return (
                <div key={id} className={`flex flex-col items-center justify-center gap-1 text-[8px] font-medium ${isActive ? 'text-primary' : 'text-black/30'}`}>
                  <span className={id === 'add' ? 'flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white' : ''}>
                    <Icon className={id === 'add' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
                  </span>
                  {id !== 'add' && <span>{label}</span>}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

export default function ProductShowcase() {
  const [activeId, setActiveId] = useState<FeatureId>('map');
  const activeFeature = features.find((feature) => feature.id === activeId) ?? features[0];

  return (
    <section id="inside-sterna" className="border-t border-black/[0.08] bg-[#f8faf8] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Inside Sterna</p>
          <h2 className="text-balance text-3xl font-bold tracking-[-0.035em] text-black md:text-5xl">Everything you need to explore.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-black/50 md:text-base">
            From the first photo to the shared map, the core experience stays simple and centered on exploration.
          </p>
        </div>

        <div className="mt-9 flex flex-wrap justify-center gap-1.5 rounded-2xl border border-black/[0.07] bg-white p-1.5 shadow-sm md:mx-auto md:w-fit">
          {features.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => setActiveId(feature.id)}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 ${
                activeId === feature.id ? 'bg-primary text-white' : 'text-black/45 hover:bg-black/[0.035] hover:text-black/70'
              }`}
            >
              {feature.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid items-center gap-10 rounded-[32px] border border-black/[0.07] bg-white p-5 shadow-[0_22px_70px_rgba(0,0,0,0.045)] md:grid-cols-[0.85fr_1.15fr] md:p-10 lg:p-14">
          <div className="md:pl-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{activeFeature.label}</p>
            <h3 className="mt-3 max-w-md text-3xl font-bold tracking-[-0.04em] text-black md:text-4xl">{activeFeature.title}</h3>
            <p className="mt-4 max-w-md text-sm leading-6 text-black/50 md:text-base md:leading-7">{activeFeature.description}</p>
          </div>

          <div className="overflow-hidden rounded-[26px] border border-black/[0.06] bg-[#f1f5f0] px-4 sm:px-8">
            <PhonePreview active={activeId} />
          </div>
        </div>
      </div>
    </section>
  );
}
