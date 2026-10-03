/**
 * The collection.
 *
 * Photography is currently pulled from stills of the reveal film, which is why
 * every car wears the same Sandgold livery — the house conceit. Drop real
 * shots into /public/fleet and swap the `image` paths; nothing else changes.
 */

export type Body = "coupe" | "targa" | "track";

export interface Motor {
  slug: string;
  model: string;
  designation: string;
  year: string;
  body: Body;
  image: string;
  power: string;
  sprint: string;
  drive: string;
  daily: number;
  note: string;
  /** One per collection — gets the gold rule and the top billing. */
  signature?: boolean;
}

export const BODIES: { id: Body | "all"; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "coupe", label: "Coupé" },
  { id: "targa", label: "Open" },
  { id: "track", label: "Track" },
];

export const FLEET: Motor[] = [
  {
    slug: "turbo-s",
    model: "Turbo S",
    designation: "992.1",
    year: "2024",
    body: "coupe",
    image: "/fleet/turbo-s.jpg",
    power: "641 bhp",
    sprint: "2.6s",
    drive: "All-wheel",
    daily: 1850,
    note: "The one that makes every other car feel like it is thinking about it.",
    signature: true,
  },
  {
    slug: "carrera-gts",
    model: "Carrera GTS",
    designation: "992.2",
    year: "2025",
    body: "coupe",
    image: "/fleet/carrera-gts.jpg",
    power: "534 bhp",
    sprint: "3.0s",
    drive: "Rear-wheel",
    daily: 1240,
    note: "Hybrid assistance, entirely hidden. You will only notice the shove.",
  },
  {
    slug: "targa-heritage",
    model: "Targa 4 GTS",
    designation: "Heritage",
    year: "2023",
    body: "targa",
    image: "/fleet/targa-heritage.jpg",
    power: "473 bhp",
    sprint: "3.4s",
    drive: "All-wheel",
    daily: 1390,
    note: "Forty seconds of theatre every time you drop the roof.",
  },
  {
    slug: "gt3-touring",
    model: "GT3 Touring",
    designation: "992",
    year: "2024",
    body: "track",
    image: "/fleet/gt3-touring.jpg",
    power: "502 bhp",
    sprint: "3.7s",
    drive: "Rear-wheel",
    daily: 1680,
    note: "Nine thousand revs and no wing to explain yourself with.",
  },
  {
    slug: "speedster",
    model: "Speedster",
    designation: "991.2",
    year: "2019",
    body: "targa",
    image: "/fleet/speedster.jpg",
    power: "502 bhp",
    sprint: "3.8s",
    drive: "Rear-wheel",
    daily: 2100,
    note: "One of 1,948. Kept for weather that deserves it.",
  },
  {
    slug: "sport-classic",
    model: "Sport Classic",
    designation: "992",
    year: "2023",
    body: "coupe",
    image: "/fleet/sport-classic.jpg",
    power: "543 bhp",
    sprint: "4.1s",
    drive: "Rear-wheel",
    daily: 1975,
    note: "A ducktail, a manual gearbox, and no apology for either.",
  },
  {
    slug: "carrera-profile",
    model: "Carrera T",
    designation: "992.2",
    year: "2025",
    body: "coupe",
    image: "/fleet/carrera-profile.jpg",
    power: "388 bhp",
    sprint: "4.3s",
    drive: "Rear-wheel",
    daily: 980,
    note: "The least car here, and the one the staff book first.",
  },
];
