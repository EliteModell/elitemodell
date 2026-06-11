import { expect, test } from "@playwright/test";
import {
  calculateBookingAmounts,
  fromCents,
  percentageCents,
  toCents,
} from "../src/lib/money";

test.describe("calculos financeiros em centavos", () => {
  test("converte valores sem erro binario acumulado", () => {
    expect(toCents(11.33)).toBe(1133);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fromCents(1999)).toBe(19.99);
  });

  test("arredonda taxa de 10% para o centavo mais proximo", () => {
    expect(percentageCents(1999, 1_000)).toBe(200);
    expect(percentageCents(1005, 1_000)).toBe(101);
  });

  test("divide total da reserva em 10% plataforma e 90% anfitriao", () => {
    const amounts = calculateBookingAmounts({
      nights: 3,
      pricePerNightCents: 10_01,
      cleaningFeeCents: 5_00,
      discountCents: 2_00,
    });
    expect(amounts).toEqual({
      subtotalCents: 30_03,
      cleaningFeeCents: 5_00,
      discountCents: 2_00,
      totalPriceCents: 33_03,
      serviceFeeCents: 3_30,
      hostPayoutCents: 29_73,
    });
    expect(amounts.serviceFeeCents + amounts.hostPayoutCents).toBe(amounts.totalPriceCents);
  });

  test("limita desconto ao subtotal e nunca gera total negativo", () => {
    const amounts = calculateBookingAmounts({
      nights: 1,
      pricePerNightCents: 10_00,
      cleaningFeeCents: 2_00,
      discountCents: 50_00,
    });
    expect(amounts.discountCents).toBe(10_00);
    expect(amounts.totalPriceCents).toBe(2_00);
    expect(amounts.serviceFeeCents).toBe(20);
    expect(amounts.hostPayoutCents).toBe(1_80);
  });

  test("aceita percentual configuravel sem perder centavos", () => {
    const amounts = calculateBookingAmounts({
      nights: 1,
      pricePerNightCents: 10_00,
      cleaningFeeCents: 0,
      discountCents: 0,
      serviceFeeBasisPoints: 1_250,
    });
    expect(amounts.serviceFeeCents).toBe(1_25);
    expect(amounts.hostPayoutCents).toBe(8_75);
  });
});
