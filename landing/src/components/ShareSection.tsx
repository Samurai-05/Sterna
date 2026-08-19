import { FaLink, FaMapMarkedAlt, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';

const points = [
  { label: 'Rome', author: 'Anna', className: 'left-[18%] top-[28%]' },
  { label: 'Florence', author: 'Luca', className: 'left-[48%] top-[42%]' },
  { label: 'Pisa', author: 'Maya', className: 'right-[17%] top-[24%]' },
];

export default function ShareSection() {
  return (
    <section id="share" className="border-t border-black/[0.08] bg-white py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-6 md:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div>
          <h2 className="max-w-lg text-balance text-3xl font-bold tracking-[-0.04em] text-black md:text-5xl">Explore together.</h2>
          <p className="mt-5 max-w-lg text-sm leading-6 text-black/50 md:text-base md:leading-7">
            Create a shared map with your friends and turn every trip into a collection of discoveries you build together.
          </p>

          <div className="mt-8 space-y-5">
            <div className="flex gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                <FaLink className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-black">Invite your friends</p>
                <p className="mt-1 text-xs leading-5 text-black/45">Join a group from a simple invitation link or code.</p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                <FaMapMarkedAlt className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-black">Build one map together</p>
                <p className="mt-1 text-xs leading-5 text-black/45">Each member adds discoveries to the same group map.</p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                <FaUsers className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-black">Keep every memory connected</p>
                <p className="mt-1 text-xs leading-5 text-black/45">Photos stay geolocated and keep the identity of the friend who shared them.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[30px] border border-black/[0.07] bg-[#f1f5f0] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.06)] sm:p-6">
          <div className="pointer-events-none absolute right-[-12%] top-[-18%] h-52 w-52 rounded-full bg-primary/[0.12] blur-[55px]" />
          <div className="relative overflow-hidden rounded-[24px] border border-black/[0.07] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3.5 sm:px-5">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-black/35">Shared map</p>
                <p className="mt-0.5 text-sm font-semibold text-black">Italy roadtrip</p>
              </div>

              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {['A', 'L', 'M', 'J'].map((initial) => (
                    <div key={initial} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-[10px] font-semibold text-white">
                      {initial}
                    </div>
                  ))}
                </div>
                <span className="ml-2 text-[10px] font-medium text-black/40">4 members</span>
              </div>
            </div>

            <div className="relative h-[380px] overflow-hidden bg-[#e9eee8] sm:h-[430px]">
              <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(to_right,rgba(45,90,61,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(45,90,61,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
              <div className="absolute left-[11%] top-[23%] h-28 w-40 rotate-[-8deg] rounded-[46%] bg-primary/[0.14]" />
              <div className="absolute bottom-[13%] right-[10%] h-36 w-32 rotate-[12deg] rounded-[48%] bg-primary/[0.1]" />

              {points.map((point) => (
                <div key={point.label} className={`absolute ${point.className}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-primary text-white shadow-[0_7px_18px_rgba(0,0,0,0.16)]">
                    <FaMapMarkerAlt className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="mt-2 -translate-x-[30%] whitespace-nowrap rounded-xl border border-black/[0.06] bg-white px-3 py-2 shadow-sm">
                    <p className="text-[10px] font-semibold text-black">{point.label}</p>
                    <p className="mt-0.5 text-[9px] text-black/40">Added by {point.author}</p>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                <div>
                  <p className="text-[10px] font-medium text-black/40">Trip progress</p>
                  <p className="mt-0.5 text-xs font-semibold text-black">18 shared discoveries</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary">+ Add discovery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
