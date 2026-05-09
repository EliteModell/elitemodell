export type Perfil = {
  id: number;
  slug: string;
  displayName: string;
  image: string;
  coverImage: string;
  verificacaoMedia?: { url: string; tipo: "foto" | "video"; data: string };
  online: boolean;
  idade: number;
  city: string;
  state: string;
  whatsapp: string;
  instagram: string;
  priceMin: number;
  price1h: number;
  price2h: number;
  priceOvernight: number;
  local: string;
  rating: number;
  totalReviews: number;
  totalAppointments: number;
  verified: boolean;
  featured: boolean;
  memberSince: string;
  bio: string;
  specialties: string[];
  atende: string[];
  categoria: "mulheres" | "trans" | "homens";
  fisico: { altura: string; peso: string; cabelo: string; olhos: string; etnia: string };
  schedule: { day: string; time: string; available: boolean }[];
  reviews: { author: string; rating: number; comment: string; date: string }[];
};

export const mockProfiles: Perfil[] = [
  {
    id: 1,
    slug: "lora",
    displayName: "Lora",
    image: "/model.jpeg",
    coverImage: "/model.jpeg",
    verificacaoMedia: { url: "/model.jpeg", tipo: "foto", data: "Mai/2025" },
    online: true,
    idade: 27,
    city: "São Paulo",
    state: "SP",
    whatsapp: "11999990001",
    instagram: "@lora.elite",
    priceMin: 800,
    price1h: 800,
    price2h: 1400,
    priceOvernight: 4500,
    local: "Com local próprio",
    rating: 5.0,
    totalReviews: 42,
    totalAppointments: 89,
    verified: true,
    featured: true,
    memberSince: "2024",
    bio: "Exclusiva. Sofisticada. Única.\n\nSou uma acompanhante de alto padrão para homens que buscam o extraordinário. Elegância, inteligência e presença marcante em qualquer ambiente.\n\nAtendo em local próprio de luxo, hotéis cinco estrelas e aceito viagens nacionais e internacionais. Fluente em inglês.",
    specialties: ["VIP", "Viagens", "Eventos", "Jantar a dois", "Hotéis"],
    atende: ["Homens"],
    categoria: "mulheres",
    fisico: { altura: "1,72m", peso: "58 kg", cabelo: "Loira", olhos: "Azul", etnia: "Branca" },
    schedule: [
      { day: "Segunda", time: "", available: false },
      { day: "Terça", time: "Com agendamento", available: true },
      { day: "Quarta", time: "Com agendamento", available: true },
      { day: "Quinta", time: "Com agendamento", available: true },
      { day: "Sexta", time: "Com agendamento", available: true },
      { day: "Sábado", time: "Com agendamento", available: true },
      { day: "Domingo", time: "", available: false },
    ],
    reviews: [
      { author: "Alexandre M.", rating: 5, comment: "A experiência mais sofisticada que já tive. Elegância e inteligência raras. Absolutamente única.", date: "Jun 2025" },
      { author: "Eduardo C.", rating: 5, comment: "Classe absoluta em cada detalhe. Recomendo sem hesitar para quem busca o melhor.", date: "Mai 2025" },
    ],
  },
  {
    id: 2,
    slug: "amanda-r",
    displayName: "Amanda R.",
    image: "/model1.jpg",
    coverImage: "/model1.jpg",
    verificacaoMedia: { url: "/model1.jpg", tipo: "foto", data: "Abr/2025" },
    online: true,
    idade: 26,
    city: "São Paulo",
    state: "SP",
    whatsapp: "11999990002",
    instagram: "@amanda.elite",
    priceMin: 150,
    price1h: 150,
    price2h: 280,
    priceOvernight: 1200,
    local: "Com local próprio",
    rating: 4.9,
    totalReviews: 87,
    totalAppointments: 203,
    verified: true,
    featured: true,
    memberSince: "2023",
    bio: "Olá, seja bem-vindo ao meu perfil. Sou uma acompanhante sofisticada, discreta e de alto nível. Ofereço momentos únicos e inesquecíveis para homens que valorizam qualidade e elegância.\n\nAtendo em local próprio, hotéis e aceito viagens. Cuido bem de cada detalhe para que você se sinta à vontade.",
    specialties: ["Acompanhamento", "Viagens", "Jantar a dois", "Hotéis", "Local próprio"],
    atende: ["Homens", "Casais"],
    categoria: "mulheres",
    fisico: { altura: "1,68m", peso: "56 kg", cabelo: "Morena", olhos: "Castanho", etnia: "Parda" },
    schedule: [
      { day: "Segunda", time: "14:00 – 00:00", available: true },
      { day: "Terça", time: "14:00 – 00:00", available: true },
      { day: "Quarta", time: "14:00 – 00:00", available: true },
      { day: "Quinta", time: "14:00 – 00:00", available: true },
      { day: "Sexta", time: "14:00 – 02:00", available: true },
      { day: "Sábado", time: "16:00 – 02:00", available: true },
      { day: "Domingo", time: "", available: false },
    ],
    reviews: [
      { author: "Rodrigo M.", rating: 5, comment: "Atendimento impecável, muito discreta e elegante. Superou todas as expectativas.", date: "Abr 2025" },
      { author: "Felipe S.", rating: 5, comment: "Pontual, educada e muito agradável. Faz você se sentir especial.", date: "Mar 2025" },
    ],
  },
  {
    id: 3,
    slug: "leticia-m",
    displayName: "Letícia M.",
    image: "/model2.jpg",
    coverImage: "/model1.jpg",
    online: false,
    idade: 24,
    city: "Rio de Janeiro",
    state: "RJ",
    whatsapp: "21999990003",
    instagram: "@leticia.m",
    priceMin: 250,
    price1h: 250,
    price2h: 450,
    priceOvernight: 1800,
    local: "Com local próprio",
    rating: 4.8,
    totalReviews: 63,
    totalAppointments: 145,
    verified: true,
    featured: false,
    memberSince: "2022",
    bio: "Especialista em massagem relaxante e tântrica. Ambiente reservado e climatizado. Atendo com hora marcada para garantir total atenção e qualidade.",
    specialties: ["Massagem", "Eventos", "Local próprio"],
    atende: ["Homens"],
    categoria: "mulheres",
    fisico: { altura: "1,65m", peso: "54 kg", cabelo: "Loira", olhos: "Verde", etnia: "Branca" },
    schedule: [
      { day: "Segunda", time: "10:00 – 22:00", available: true },
      { day: "Terça", time: "10:00 – 22:00", available: true },
      { day: "Quarta", time: "10:00 – 22:00", available: true },
      { day: "Quinta", time: "10:00 – 22:00", available: true },
      { day: "Sexta", time: "10:00 – 00:00", available: true },
      { day: "Sábado", time: "12:00 – 00:00", available: true },
      { day: "Domingo", time: "", available: false },
    ],
    reviews: [
      { author: "Carlos R.", rating: 5, comment: "Massagem incrível, ambiente perfeito. Voltarei com certeza.", date: "Mai 2025" },
      { author: "Marcos T.", rating: 4, comment: "Ótimo atendimento, muito cuidadosa.", date: "Abr 2025" },
    ],
  },
];

export function getPerfilById(id: number | string): Perfil | undefined {
  const numId = typeof id === "string" ? parseInt(id) : id;
  return mockProfiles.find((p) => p.id === numId);
}

export function getPerfilBySlug(slug: string): Perfil | undefined {
  return mockProfiles.find((p) => p.slug === slug);
}

export function getPerfil(idOrSlug: string): Perfil {
  const byId = getPerfilById(idOrSlug);
  if (byId) return byId;
  const bySlug = getPerfilBySlug(idOrSlug);
  if (bySlug) return bySlug;
  return mockProfiles[0];
}
