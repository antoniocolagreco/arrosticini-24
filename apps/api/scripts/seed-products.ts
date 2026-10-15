import type { ProductStatus } from "@arrosticini/catalog";
import type { LocalizedText } from "@arrosticini/kernel";

export interface SeedProduct {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  pieces?: number;
  priceCents: number;
  image: string;
  status: ProductStatus;
}

export const seedProducts: SeedProduct[] = [
  {
    slug: "arrosticini-75",
    name: { it: "Arrosticini 75 pezzi", en: "Arrosticini 75 pieces" },
    description: {
      it: "75 arrosticini di pecora tagliati a mano, pronti per la brace.",
      en: "75 hand-cut mutton skewers, ready for the grill.",
    },
    pieces: 75,
    priceCents: 3750,
    image: "p_arrosticini.webp",
    status: "ACTIVE",
  },
  {
    slug: "arrosticini-225",
    name: { it: "Pacco da 225", en: "225-piece pack" },
    description: {
      it: "225 arrosticini di pecora per una grigliata tra amici.",
      en: "225 mutton skewers for a barbecue with friends.",
    },
    pieces: 225,
    priceCents: 11250,
    image: "p_arrosticini_pack.webp",
    status: "ACTIVE",
  },
  {
    slug: "arrosticini-3600",
    name: { it: "Mini pallet", en: "Mini pallet" },
    description: {
      it: "3600 arrosticini di pecora per feste e sagre.",
      en: "3,600 mutton skewers for parties and festivals.",
    },
    pieces: 3600,
    priceCents: 180000,
    image: "p_arrosticini_pallet.webp",
    status: "ACTIVE",
  },
  {
    slug: "cuoco",
    name: { it: "Cuoco a domicilio", en: "Chef at home" },
    description: {
      it: "Un arrosticinaro esperto cucina gli arrosticini a casa tua.",
      en: "An expert skewer chef grills the arrosticini at your home.",
    },
    priceCents: 5000,
    image: "p_cuoco.webp",
    status: "ACTIVE",
  },
  {
    slug: "vino",
    name: { it: "Vino locale", en: "Local wine" },
    description: {
      it: "Vino rosso del territorio, perfetto con gli arrosticini.",
      en: "Local red wine, perfect with arrosticini.",
    },
    priceCents: 500,
    image: "p_vino.webp",
    status: "ACTIVE",
  },
  {
    slug: "carbone",
    name: { it: "Carbone", en: "Charcoal" },
    description: {
      it: "Carbone di legna per accendere la fornacella.",
      en: "Lump charcoal to light the grill.",
    },
    priceCents: 2000,
    image: "p_carbone.webp",
    status: "ACTIVE",
  },
  {
    slug: "pecora-diy",
    name: { it: "Pecora per arrosticini DIY", en: "Sheep for DIY arrosticini" },
    description: {
      it: "Una pecora intera per preparare gli arrosticini da te.",
      en: "A whole sheep to make your own arrosticini.",
    },
    priceCents: 40000,
    image: "p_sheep.webp",
    status: "ACTIVE",
  },
  {
    slug: "fornacella",
    name: { it: "Fornacella", en: "Arrosticini grill" },
    description: {
      it: "La griglia lunga e stretta della tradizione abruzzese.",
      en: "The long, narrow grill of the Abruzzo tradition.",
    },
    priceCents: 10000,
    image: "p_fornacella.webp",
    status: "ACTIVE",
  },
];
