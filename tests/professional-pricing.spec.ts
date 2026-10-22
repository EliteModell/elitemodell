import { expect, test } from "@playwright/test";
import { professionalPriceOptions, professionalStartingPrice } from "../src/lib/professional-pricing";

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

