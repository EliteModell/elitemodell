import { expect, test } from "@playwright/test";
import {
  formatProfessionalPrice,
  professionalAppointmentPrices,
  compareProfessionalStartingPrice,
  professionalDerivedPriceRange,
  professionalPriceForDuration,
  professionalPriceOptions,
  professionalStartingPrice,
} from "../src/lib/professional-pricing";

test("usa o menor valor real e preserva a duração", () => {
  expect(professionalStartingPrice({ price15min: 150, pricePerHour: 300, price2h: 550 })).toMatchObject({
    value: 150,
    label: "15 minutos",
    shortLabel: "15 min",
  });
});

test("não inventa preços para durações não preenchidas", () => {
  expect(professionalPriceOptions({ pricePerHour: 300 })).toEqual([
    expect.objectContaining({ label: "1 hora", value: 300 }),
  ]);
});

test("mantém compatibilidade controlada com priceMin legado", () => {
  expect(professionalStartingPrice({ priceMin: 250 })).toMatchObject({
    value: 250,
    shortLabel: "consulte a duração",
  });
});

test("resolve o valor exato da duração escolhida sem converter nem estimar", () => {
  const prices = { price15min: 120, price30min: 200, pricePerHour: 300, price2h: 550 };
  expect(professionalPriceForDuration(prices, 15)?.value).toBe(120);
  expect(professionalPriceForDuration(prices, 30)?.value).toBe(200);
  expect(professionalPriceForDuration(prices, 60)?.value).toBe(300);
  expect(professionalPriceForDuration(prices, 120)?.value).toBe(550);
  expect(professionalPriceForDuration(prices, 45)).toBeNull();
});

test("deriva a faixa somente das modalidades reais e permite remover todas", () => {
  expect(professionalDerivedPriceRange({ price15min: 120, price30min: null, pricePerHour: 300, price2h: 550, priceOvernight: 900, priceWebcam: 80 }))
    .toEqual({ priceMin: 80, priceMax: 900 });
  expect(professionalDerivedPriceRange({ price15min: null, price30min: null, pricePerHour: null, price2h: null }))
    .toEqual({ priceMin: null, priceMax: null });
});

test("ordena pelo menor preço real sem usar priceMin legado quando há modalidades", () => {
  const rows = [
    { id: "legado", priceMin: 10, pricePerHour: 500 },
    { id: "real", priceMin: 900, price15min: 100 },
    { id: "sem-preco" },
  ];
  expect([...rows].sort((a, b) => compareProfessionalStartingPrice(a, b, "asc")).map((row) => row.id))
    .toEqual(["real", "legado", "sem-preco"]);
  expect([...rows].sort((a, b) => compareProfessionalStartingPrice(a, b, "desc")).map((row) => row.id))
    .toEqual(["legado", "real", "sem-preco"]);
});

test("agendamento oferece somente duracoes realmente configuradas", () => {
  expect(professionalAppointmentPrices({ price15min: 120, price2h: 500, priceOvernight: 900 })).toEqual([
    expect.objectContaining({ duration: 15, price: expect.objectContaining({ value: 120 }) }),
    expect.objectContaining({ duration: 120, price: expect.objectContaining({ value: 500 }) }),
  ]);
});

test("formata valor e modalidade juntos e nunca inventa fallback", () => {
  expect(formatProfessionalPrice({ price30min: 200 })).toBe("A partir de R$ 200 · 30 min");
  expect(formatProfessionalPrice({})).toBe("Consultar");
});

