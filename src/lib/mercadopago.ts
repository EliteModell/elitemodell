import { MercadoPagoConfig, Payment } from "mercadopago";

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.warn("[mercadopago] MERCADOPAGO_ACCESS_TOKEN não configurado — pagamentos não funcionarão.");
}

export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
  options: { timeout: 5000 },
});

export const mpPayment = new Payment(mpClient);
