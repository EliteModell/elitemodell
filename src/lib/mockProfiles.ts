export type Perfil = {
  id: number;
  slug: string;
  displayName: string;
  image: string;
  coverImage: string;
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
    id: 1, slug: "amanda-r", displayName: "Amanda R.", image: "/model1.jpg", coverImage: "/model2.jpg",
    online: true, idade: 26, city: "São Paulo", state: "SP", whatsapp: "11999990001", instagram: "@amanda.elite",
    priceMin: 150, price1h: 150, price2h: 280, priceOvernight: 1200,
    local: "Com local próprio", rating: 4.9, totalReviews: 87, totalAppointments: 203,
    verified: true, featured: true, memberSince: "2023",
    bio: "Olá, seja bem-vindo ao meu perfil. Sou uma acompanhante sofisticada, discreta e de alto nível. Ofereço momentos únicos e inesquecíveis.\n\nAtendo em local próprio, hotéis e aceito viagens.",
    specialties: ["Acompanhamento", "Viagens", "Jantar a dois", "Hotéis", "Local próprio"],
    atende: ["Homens", "Casais"], categoria: "mulheres",
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
    id: 2, slug: "leticia-m", displayName: "Letícia M.", image: "/model2.jpg", coverImage: "/model1.jpg",
    online: false, idade: 24, city: "Rio de Janeiro", state: "RJ", whatsapp: "21999990002", instagram: "@leticia.m",
    priceMin: 250, price1h: 250, price2h: 450, priceOvernight: 1800,
    local: "Com local próprio", rating: 4.8, totalReviews: 63, totalAppointments: 145,
    verified: true, featured: false, memberSince: "2022",
    bio: "Especialista em massagem relaxante e tântrica. Ambiente reservado e climatizado. Atendo com hora marcada para garantir total atenção.",
    specialties: ["Massagem", "Eventos", "Local próprio"],
    atende: ["Homens"], categoria: "mulheres",
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
  {
    id: 3, slug: "bruna-s", displayName: "Bruna S.", image: "/model1.jpg", coverImage: "/model2.jpg",
    online: true, idade: 22, city: "Curitiba", state: "PR", whatsapp: "41999990003", instagram: "@brunas",
    priceMin: 120, price1h: 120, price2h: 220, priceOvernight: 800,
    local: "A domicílio", rating: 5.0, totalReviews: 120, totalAppointments: 310,
    verified: true, featured: true, memberSince: "2023",
    bio: "Jovem e divertida, corpo sarado, muito carinhosa. Aceito hotéis e motéis. Discrição total garantida em todos os atendimentos.",
    specialties: ["Acompanhamento", "Hotéis"],
    atende: ["Homens", "Casais"], categoria: "mulheres",
    fisico: { altura: "1,62m", peso: "52 kg", cabelo: "Morena", olhos: "Castanho", etnia: "Parda" },
    schedule: [
      { day: "Segunda", time: "12:00 – 23:00", available: true },
      { day: "Terça", time: "12:00 – 23:00", available: true },
      { day: "Quarta", time: "12:00 – 23:00", available: true },
      { day: "Quinta", time: "12:00 – 23:00", available: true },
      { day: "Sexta", time: "12:00 – 02:00", available: true },
      { day: "Sábado", time: "14:00 – 02:00", available: true },
      { day: "Domingo", time: "14:00 – 22:00", available: true },
    ],
    reviews: [
      { author: "Paulo V.", rating: 5, comment: "A melhor da cidade! Muito carinhosa e atenciosa.", date: "Jun 2025" },
    ],
  },
  {
    id: 4, slug: "fernanda-k", displayName: "Fernanda K.", image: "/model2.jpg", coverImage: "/model1.jpg",
    online: true, idade: 29, city: "São Paulo", state: "SP", whatsapp: "11999990004", instagram: "@fernandak.vip",
    priceMin: 800, price1h: 800, price2h: 1400, priceOvernight: 4000,
    local: "Com local próprio", rating: 4.7, totalReviews: 45, totalAppointments: 89,
    verified: true, featured: true, memberSince: "2021",
    bio: "Perfil VIP para clientes exigentes. Disponível para viagens nacionais e internacionais. Fluente em inglês e espanhol. Ambientes exclusivos.",
    specialties: ["VIP", "Viagens", "Eventos"],
    atende: ["Homens"], categoria: "mulheres",
    fisico: { altura: "1,72m", peso: "60 kg", cabelo: "Loira", olhos: "Azul", etnia: "Branca" },
    schedule: [
      { day: "Segunda", time: "", available: false },
      { day: "Terça", time: "15:00 – 23:00", available: true },
      { day: "Quarta", time: "15:00 – 23:00", available: true },
      { day: "Quinta", time: "15:00 – 23:00", available: true },
      { day: "Sexta", time: "15:00 – 02:00", available: true },
      { day: "Sábado", time: "18:00 – 02:00", available: true },
      { day: "Domingo", time: "", available: false },
    ],
    reviews: [
      { author: "Alexandre M.", rating: 5, comment: "Experiência de outro nível. Elegante, inteligente e incrível.", date: "Mai 2025" },
    ],
  },
  {
    id: 5, slug: "isabela-c", displayName: "Isabela C.", image: "/model1.jpg", coverImage: "/model2.jpg",
    online: false, idade: 27, city: "Belo Horizonte", state: "MG", whatsapp: "31999990005", instagram: "@isabela.c",
    priceMin: 320, price1h: 320, price2h: 580, priceOvernight: 2000,
    local: "Com local próprio", rating: 4.9, totalReviews: 92, totalAppointments: 198,
    verified: true, featured: false, memberSince: "2022",
    bio: "Especialista em massagem tântrica e relaxamento total. Ambiente luxuoso e sigiloso no centro da cidade. Cada encontro é uma experiência única.",
    specialties: ["Massagem tântrica", "Local próprio"],
    atende: ["Homens", "Mulheres"], categoria: "mulheres",
    fisico: { altura: "1,66m", peso: "57 kg", cabelo: "Castanho", olhos: "Mel", etnia: "Parda" },
    schedule: [
      { day: "Segunda", time: "14:00 – 22:00", available: true },
      { day: "Terça", time: "14:00 – 22:00", available: true },
      { day: "Quarta", time: "14:00 – 22:00", available: true },
      { day: "Quinta", time: "14:00 – 22:00", available: true },
      { day: "Sexta", time: "14:00 – 00:00", available: true },
      { day: "Sábado", time: "16:00 – 00:00", available: true },
      { day: "Domingo", time: "", available: false },
    ],
    reviews: [
      { author: "Roberto F.", rating: 5, comment: "Massagem tântrica de outro nível. Ambiente incrível.", date: "Jun 2025" },
      { author: "André S.", rating: 5, comment: "Muito profissional e carinhosa. Recomendo!", date: "Abr 2025" },
    ],
  },
  {
    id: 6, slug: "carolina-v", displayName: "Carolina V.", image: "/model2.jpg", coverImage: "/model1.jpg",
    online: true, idade: 25, city: "São Paulo", state: "SP", whatsapp: "11999990006", instagram: "@carolinav",
    priceMin: 180, price1h: 180, price2h: 320, priceOvernight: 1400,
    local: "Com local próprio", rating: 4.7, totalReviews: 54, totalAppointments: 122,
    verified: false, featured: false, memberSince: "2023",
    bio: "Loira natural, olhos verdes, muito simpática. Local próprio na zona sul. Disponível todos os dias. Atendimento diferenciado com muito carinho.",
    specialties: ["Acompanhamento", "Local próprio"],
    atende: ["Homens"], categoria: "mulheres",
    fisico: { altura: "1,64m", peso: "55 kg", cabelo: "Loira", olhos: "Verde", etnia: "Branca" },
    schedule: [
      { day: "Segunda", time: "10:00 – 22:00", available: true },
      { day: "Terça", time: "10:00 – 22:00", available: true },
      { day: "Quarta", time: "10:00 – 22:00", available: true },
      { day: "Quinta", time: "10:00 – 22:00", available: true },
      { day: "Sexta", time: "10:00 – 23:00", available: true },
      { day: "Sábado", time: "12:00 – 23:00", available: true },
      { day: "Domingo", time: "12:00 – 20:00", available: true },
    ],
    reviews: [
      { author: "Gustavo P.", rating: 5, comment: "Muito simpática e atenciosa. Local muito agradável.", date: "Mai 2025" },
    ],
  },
  {
    id: 7, slug: "juliana-t", displayName: "Juliana T.", image: "/model1.jpg", coverImage: "/model2.jpg",
    online: true, idade: 31, city: "Recife", state: "PE", whatsapp: "81999990007", instagram: "@juliana.t.vip",
    priceMin: 1200, price1h: 1200, price2h: 2200, priceOvernight: 6000,
    local: "Aceita viajar", rating: 5.0, totalReviews: 31, totalAppointments: 67,
    verified: true, featured: true, memberSince: "2020",
    bio: "Executiva sofisticada, discreta e culta. Acompanho em viagens nacionais e internacionais. Fluente em inglês. Presença marcante em qualquer evento.",
    specialties: ["VIP", "Viagens", "Eventos"],
    atende: ["Homens"], categoria: "mulheres",
    fisico: { altura: "1,75m", peso: "62 kg", cabelo: "Ruiva", olhos: "Verde", etnia: "Branca" },
    schedule: [
      { day: "Segunda", time: "", available: false },
      { day: "Terça", time: "", available: false },
      { day: "Quarta", time: "Com agendamento", available: true },
      { day: "Quinta", time: "Com agendamento", available: true },
      { day: "Sexta", time: "Com agendamento", available: true },
      { day: "Sábado", time: "Com agendamento", available: true },
      { day: "Domingo", time: "", available: false },
    ],
    reviews: [
      { author: "Eduardo C.", rating: 5, comment: "Classe absoluta. Uma das melhores experiências da minha vida.", date: "Jun 2025" },
    ],
  },
  {
    id: 8, slug: "patricia-l", displayName: "Patricia L.", image: "/model2.jpg", coverImage: "/model1.jpg",
    online: false, idade: 28, city: "Brasília", state: "DF", whatsapp: "61999990008", instagram: "@patricial",
    priceMin: 200, price1h: 200, price2h: 360, priceOvernight: 1500,
    local: "Com local próprio", rating: 4.6, totalReviews: 77, totalAppointments: 167,
    verified: true, featured: false, memberSince: "2022",
    bio: "Companhia para jantar, eventos e momentos especiais. Apresentável, bem relacionada e muito discreta. Atendo com hora marcada.",
    specialties: ["Acompanhamento", "Jantar"],
    atende: ["Homens", "Casais"], categoria: "mulheres",
    fisico: { altura: "1,67m", peso: "58 kg", cabelo: "Morena", olhos: "Castanho", etnia: "Negra" },
    schedule: [
      { day: "Segunda", time: "14:00 – 22:00", available: true },
      { day: "Terça", time: "14:00 – 22:00", available: true },
      { day: "Quarta", time: "14:00 – 22:00", available: true },
      { day: "Quinta", time: "14:00 – 22:00", available: true },
      { day: "Sexta", time: "14:00 – 23:00", available: true },
      { day: "Sábado", time: "16:00 – 23:00", available: true },
      { day: "Domingo", time: "", available: false },
    ],
    reviews: [
      { author: "Marcos B.", rating: 5, comment: "Elegante e muito agradável. Ótima companhia para jantar.", date: "Mai 2025" },
      { author: "Sérgio L.", rating: 4, comment: "Muito bem arrumada e simpática.", date: "Mar 2025" },
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
