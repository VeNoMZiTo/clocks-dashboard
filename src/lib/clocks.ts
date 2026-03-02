export type ClockPricePoint = {
  date: string;
  price: number;
};

export type Clock = {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  island: string;
  source: string;
  publishedAt: string;
  firstSeenAt: string;
  updatedAt: string;
  sourceUrl: string;
  photos: string[];
  priceHistory: ClockPricePoint[];
};

const clocks: Clock[] = [
  {
    id: "reloj-at-001",
    title: "Rolex Submariner 116610LN",
    description:
      "Edición clásica en acero Oyster con bisel Cerachrom. Conserva caja y brazalete originales, con mantenimiento reciente. Incluye documentación y estuche.",
    price: 10350,
    currency: "EUR",
    island: "Tenerife",
    source: "Relojería Isla Norte",
    publishedAt: "2026-02-14",
    firstSeenAt: "2026-02-02",
    updatedAt: "2026-03-01",
    sourceUrl: "https://elatico.com/fuentes/relojeria-isla-norte",
    photos: [
      "/assets/clocks/submariner-1.svg",
      "/assets/clocks/submariner-2.svg",
      "/assets/clocks/submariner-3.svg",
      "/assets/clocks/submariner-4.svg"
    ],
    priceHistory: [
      { date: "2026-02-02", price: 11200 },
      { date: "2026-02-10", price: 10950 },
      { date: "2026-02-18", price: 10700 },
      { date: "2026-02-25", price: 10550 },
      { date: "2026-03-01", price: 10350 }
    ]
  },
  {
    id: "reloj-at-002",
    title: "Omega Speedmaster Professional",
    description:
      "Cronógrafo icónico con calibre 1861. Brazalete con ligera pátina natural y cristal hesalite. Revisado por taller autorizado.",
    price: 6750,
    currency: "EUR",
    island: "Gran Canaria",
    source: "Chronos del Atlántico",
    publishedAt: "2026-02-20",
    firstSeenAt: "2026-02-08",
    updatedAt: "2026-02-28",
    sourceUrl: "https://elatico.com/fuentes/chronos-atlantico",
    photos: [
      "/assets/clocks/speedmaster-1.svg",
      "/assets/clocks/speedmaster-2.svg",
      "/assets/clocks/speedmaster-3.svg"
    ],
    priceHistory: [
      { date: "2026-02-08", price: 7100 },
      { date: "2026-02-14", price: 6990 },
      { date: "2026-02-20", price: 6850 },
      { date: "2026-02-24", price: 6790 },
      { date: "2026-02-28", price: 6750 }
    ]
  }
];

export function getClockById(id: string): Clock | undefined {
  return clocks.find((clock) => clock.id === id);
}

export function getAllClocks(): Clock[] {
  return clocks;
}
