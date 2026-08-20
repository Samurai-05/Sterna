"use client";

import createGlobe from "cobe";
import React, { useCallback, useEffect, useRef } from "react";

const polaroidMarkers = [
  {
    id: "polaroid-sf",
    location: [37.78, -122.44] as [number, number],
    image: "https://cobe.vercel.app/sf.jpg",
    caption: "San Francisco",
    rotate: -5,
  },
  {
    id: "polaroid-nyc",
    location: [40.71, -74.01] as [number, number],
    image: "https://cobe.vercel.app/nyc.jpg",
    caption: "New York",
    rotate: 4,
  },
  {
    id: "polaroid-tokyo",
    location: [35.68, 139.65] as [number, number],
    image: "https://cobe.vercel.app/tokyo.jpg",
    caption: "Tokyo",
    rotate: -3,
  },
  {
    id: "polaroid-sydney",
    location: [-33.87, 151.21] as [number, number],
    image: "https://cobe.vercel.app/sydney.jpg",
    caption: "Sydney",
    rotate: 6,
  },
  {
    id: "polaroid-beijing",
    location: [39.9, 116.4] as [number, number],
    image: "https://cobe.vercel.app/beijing.jpg",
    caption: "Beijing",
    rotate: -4,
  },
  {
    id: "polaroid-egypt",
    location: [29.98, 31.13] as [number, number],
    image: "https://cobe.vercel.app/egypt.jpg",
    caption: "Egypt",
    rotate: 3,
  },
  {
    id: "polaroid-pisa",
    location: [43.72, 10.4] as [number, number],
    image: "https://cobe.vercel.app/pisa.jpg",
    caption: "Pisa",
    rotate: -6,
  },
  {
    id: "polaroid-singapore",
    location: [1.35, 103.82] as [number, number],
    image: "https://cobe.vercel.app/singapore.jpg",
    caption: "Singapore",
    rotate: 5,
  },
  {
    id: "polaroid-chillon",
    location: [46.4142, 6.9275] as [number, number],
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Ch%C3%A2teau_de_Chillon.jpg?width=640",
    caption: "Chillon",
    rotate: 3,
  },
  {
    id: "polaroid-deadvlei",
    location: [-24.7609, 15.2922] as [number, number],
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/054e_Dead_camel_thorn_tree_in_Deadvlei_Photo_by_Giles_Laurent.jpg?width=640",
    caption: "Deadvlei",
    rotate: -4,
  },
  {
    id: "polaroid-rio",
    location: [-22.9519, -43.2105] as [number, number],
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Christ_the_Redeemer_statue_at_Corcovado.JPG?width=640",
    caption: "Rio de Janeiro",
    rotate: 2,
  },
  {
    id: "polaroid-table-mountain",
    location: [-33.9628, 18.4098] as [number, number],
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Table_mountain_in_Cape_Town.jpg?width=640",
    caption: "Cape Town",
    rotate: 5,
  },
  {
    id: "polaroid-santorini",
    location: [36.4618, 25.3753] as [number, number],
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Oia_-_Santorini.jpg?width=640",
    caption: "Santorini",
    rotate: -4,
  },
  {
    id: "polaroid-uluru",
    location: [-25.3444, 131.0369] as [number, number],
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/ULURU.jpg?width=640",
    caption: "Uluru",
    rotate: 4,
  },
  {
    id: "polaroid-machu-picchu",
    location: [-13.1631, -72.545] as [number, number],
    image:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Machu_picchu.jpg?width=640",
    caption: "Machu Picchu",
    rotate: -5,
  },
];

const MARKER_SIZE = 0.02;
const NEARBY_CLUSTER_DISTANCE_KM = 3000;
const CLUSTER_SESSION_RESET_MS = 280;
const EARTH_RADIUS_KM = 6371;

const markerById = new Map(
  polaroidMarkers.map((marker) => [marker.id, marker]),
);

type NearbyCluster = {
  key: string;
  members: string[];
};

type ClusterSession = {
  active: boolean;
  cursor: number;
  selectedId: string;
  hiddenSince: number | null;
};

function haversineDistanceKm(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number],
) {
  const toRad = Math.PI / 180;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const deltaPhi = (lat2 - lat1) * toRad;
  const deltaLambda = (lon2 - lon1) * toRad;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function buildNearbyClusters(): NearbyCluster[] {
  const graph = new Map<string, Set<string>>();

  for (const marker of polaroidMarkers) {
    graph.set(marker.id, new Set());
  }

  for (let i = 0; i < polaroidMarkers.length; i += 1) {
    for (let j = i + 1; j < polaroidMarkers.length; j += 1) {
      const a = polaroidMarkers[i];
      const b = polaroidMarkers[j];

      if (
        haversineDistanceKm(a.location, b.location) >
        NEARBY_CLUSTER_DISTANCE_KM
      ) {
        continue;
      }

      graph.get(a.id)?.add(b.id);
      graph.get(b.id)?.add(a.id);
    }
  }

  const clusters: NearbyCluster[] = [];
  const visited = new Set<string>();

  for (const marker of polaroidMarkers) {
    const neighbors = graph.get(marker.id);
    if (!neighbors || neighbors.size === 0 || visited.has(marker.id)) continue;

    const members: string[] = [];
    const queue = [marker.id];
    visited.add(marker.id);

    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) continue;

      members.push(id);
      for (const neighbor of Array.from(graph.get(id) ?? [])) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    clusters.push({
      key: [...members].sort().join("|"),
      members,
    });
  }

  return clusters;
}

const nearbyClusters = buildNearbyClusters();
const clusteredMarkerIds = new Set(
  nearbyClusters.flatMap((cluster) => cluster.members),
);
const standaloneMarkerIds = polaroidMarkers
  .filter((marker) => !clusteredMarkerIds.has(marker.id))
  .map((marker) => marker.id);
const initialSelectedMarkerIds = new Set([
  ...standaloneMarkerIds,
  ...nearbyClusters.map((cluster) => cluster.members[0]),
]);

function latLonTo3D([lat, lon]: [number, number]) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180 - Math.PI;
  const cosLat = Math.cos(latRad);

  return [
    -cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    cosLat * Math.sin(lonRad),
  ] as const;
}

function markerDepth(
  location: [number, number],
  phi: number,
  theta: number,
) {
  const [x, y, z] = latLonTo3D(location);
  const cx = Math.cos(theta);
  const sx = Math.sin(theta);
  const cy = Math.cos(phi);
  const sy = Math.sin(phi);

  return -sy * cx * x + sx * y + cy * cx * z;
}

export function GlobePolaroids() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const polaroidRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ phi: 0, theta: 0 });
  const phiRef = useRef(0);
  const thetaRef = useRef(0.2);
  const isDraggingRef = useRef(false);
  const clusterSessionsRef = useRef<Map<string, ClusterSession>>(new Map());
  const selectedMarkerIdsRef = useRef<Set<string>>(
    new Set(initialSelectedMarkerIds),
  );

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!pointerInteracting.current) return;

    const deltaX = event.clientX - pointerInteracting.current.x;
    const deltaY = event.clientY - pointerInteracting.current.y;

    dragOffset.current = {
      phi: deltaX / 150,
      theta: deltaY / 300,
    };
  }, []);

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current) {
      phiRef.current += dragOffset.current.phi;
      thetaRef.current = Math.max(
        -1.15,
        Math.min(1.15, thetaRef.current + dragOffset.current.theta),
      );
      dragOffset.current = { phi: 0, theta: 0 };
    }

    pointerInteracting.current = null;
    isDraggingRef.current = false;

    if (canvasRef.current) {
      canvasRef.current.style.cursor = "grab";
    }
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const width = canvasRef.current.offsetWidth;
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      window.innerWidth < 640 ? 1.8 : 2,
    );

    const sessions = new Map<string, ClusterSession>();
    for (const cluster of nearbyClusters) {
      sessions.set(cluster.key, {
        active: false,
        cursor: 0,
        selectedId: cluster.members[0],
        hiddenSince: null,
      });
    }
    clusterSessionsRef.current = sessions;

    const getSelectedIds = () => {
      const selected = new Set(standaloneMarkerIds);

      for (const cluster of nearbyClusters) {
        const session = clusterSessionsRef.current.get(cluster.key);
        selected.add(session?.selectedId ?? cluster.members[0]);
      }

      return selected;
    };

    const buildCobeMarkers = (selectedIds: Set<string>) =>
      polaroidMarkers
        .filter((marker) => selectedIds.has(marker.id))
        .map((marker) => ({
          location: marker.location,
          size: MARKER_SIZE,
          id: marker.id,
        }));

    const applyPolaroidSelection = (selectedIds: Set<string>) => {
      for (const marker of polaroidMarkers) {
        const element = polaroidRefs.current[marker.id];
        if (!element) continue;
        element.style.display = selectedIds.has(marker.id) ? "block" : "none";
      }
    };

    let selectedIds = getSelectedIds();
    selectedMarkerIdsRef.current = selectedIds;
    applyPolaroidSelection(selectedIds);

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: dpr,
      width,
      height: width,
      phi: 0,
      theta: 0.2,
      dark: 0,
      diffuse: 1.5,
      mapSamples: 16000,
      mapBrightness: 9,
      baseColor: [1, 1, 1],
      markerColor: [0.1764705882, 0.3529411765, 0.2392156863],
      // Sterna green (#2D5A3D), kept subtle by the globe's own glow rendering.
      glowColor: [0.1764705882, 0.3529411765, 0.2392156863],
      markerElevation: 0,
      markers: buildCobeMarkers(selectedIds),
      arcs: [],
      arcColor: [0.5, 0.7, 1],
      arcWidth: 0.5,
      arcHeight: 0.25,
      opacity: 0.7,
    });

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let prefersReducedMotion = reducedMotionQuery.matches;
    let isVisible = true;
    let animationId: number | null = null;

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches;
    };

    function updateClusterSessions(phi: number, theta: number, now: number) {
      let selectionChanged = false;

      for (const cluster of nearbyClusters) {
        const session = clusterSessionsRef.current.get(cluster.key);
        if (!session) continue;

        const anyFront = cluster.members.some((id) => {
          const marker = markerById.get(id);
          return marker ? markerDepth(marker.location, phi, theta) >= 0 : false;
        });

        if (!session.active && anyFront) {
          const nextSelectedId =
            cluster.members[session.cursor % cluster.members.length];

          if (session.selectedId !== nextSelectedId) {
            session.selectedId = nextSelectedId;
            selectionChanged = true;
          }

          session.cursor = (session.cursor + 1) % cluster.members.length;
          session.active = true;
          session.hiddenSince = null;
          continue;
        }

        if (!session.active) continue;

        if (anyFront) {
          session.hiddenSince = null;
        } else if (session.hiddenSince === null) {
          session.hiddenSince = now;
        } else if (now - session.hiddenSince >= CLUSTER_SESSION_RESET_MS) {
          session.active = false;
          session.hiddenSince = null;
        }
      }

      return selectionChanged;
    }

    function animate(now: number) {
      if (!isVisible) {
        animationId = null;
        return;
      }

      if (!isDraggingRef.current && !prefersReducedMotion) {
        phiRef.current += 0.003;
      }

      const phi = phiRef.current + dragOffset.current.phi;
      const theta = Math.max(
        -1.15,
        Math.min(1.15, thetaRef.current + dragOffset.current.theta),
      );

      const selectionChanged = updateClusterSessions(phi, theta, now);

      if (selectionChanged) {
        selectedIds = getSelectedIds();
        selectedMarkerIdsRef.current = selectedIds;
        applyPolaroidSelection(selectedIds);
        globe.update({
          phi,
          theta,
          markers: buildCobeMarkers(selectedIds),
        });
      } else {
        globe.update({ phi, theta });
      }

      animationId = requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (animationId === null && isVisible) {
        animationId = requestAnimationFrame(animate);
      }
    }

    function stopAnimation() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          startAnimation();
        } else {
          stopAnimation();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );

    if (wrapperRef.current) {
      intersectionObserver.observe(wrapperRef.current);
    }

    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
    startAnimation();

    return () => {
      intersectionObserver.disconnect();
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
      stopAnimation();
      globe.destroy();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="cobe-polaroids">
      <canvas
        ref={canvasRef}
        className="cobe-polaroids-canvas"
        aria-label="Interactive globe showing visited places"
        onPointerDown={(event) => {
          pointerInteracting.current = {
            x: event.clientX,
            y: event.clientY,
          };
          isDraggingRef.current = true;
          dragOffset.current = { phi: 0, theta: 0 };

          if (canvasRef.current) {
            canvasRef.current.style.cursor = "grabbing";
          }
        }}
      />

      {polaroidMarkers.map((marker) => (
        <div
          key={marker.id}
          ref={(element) => {
            polaroidRefs.current[marker.id] = element;
          }}
          className="showcase-polaroid"
          style={
            {
              positionAnchor: `--cobe-${marker.id}`,
              opacity: `var(--cobe-visible-${marker.id}, 0)`,
              filter: `blur(calc((1 - var(--cobe-visible-${marker.id}, 0)) * 8px))`,
              "--polaroid-rotate": `${marker.rotate}deg`,
              display: initialSelectedMarkerIds.has(marker.id) ? "block" : "none",
            } as React.CSSProperties
          }
        >
          <div className="showcase-polaroid-card">
            <img src={marker.image} alt={marker.caption} />
            <span className="showcase-polaroid-caption">{marker.caption}</span>
          </div>
        </div>
      ))}

      <style jsx>{`
        .cobe-polaroids {
          width: 100%;
          max-width: 520px;
          aspect-ratio: 1;
          position: relative;
          user-select: none;
          margin: 0 auto;
          contain: layout style;
        }

        .cobe-polaroids-canvas {
          width: 100%;
          height: 100%;
          cursor: grab;
          touch-action: pan-y;
        }

        .cobe-polaroids-canvas:active {
          cursor: grabbing;
        }

        .showcase-polaroid {
          position: absolute;
          bottom: anchor(top);
          left: anchor(center);
          translate: -50% 0;
          margin-bottom: 8px;
          transition: opacity 0.3s, filter 0.3s;
          pointer-events: none;
        }

        .showcase-polaroid-card {
          position: relative;
          background: #fff;
          padding: 6px 6px 24px;
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.15),
            0 1px 2px rgba(0, 0, 0, 0.1);
          transform: rotate(var(--polaroid-rotate, 0deg));
        }

        .showcase-polaroid img {
          display: block;
          width: 72px;
          height: 72px;
          object-fit: cover;
        }

        .showcase-polaroid-caption {
          position: absolute;
          bottom: 5px;
          left: 0;
          right: 0;
          text-align: center;
          font-family: var(--font-sans), sans-serif;
          font-size: 0.625rem;
          font-weight: 500;
          line-height: 1.1;
          color: #222;
          letter-spacing: 0;
        }
      `}</style>
    </div>
  );
}

export default GlobePolaroids;
