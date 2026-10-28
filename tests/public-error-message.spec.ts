import { expect, test } from "@playwright/test";
import { publicErrorMessage, videoUploadErrorMessage } from "../src/lib/public-error-message";

test("erros tecnicos e mensagens inglesas nao chegam ao cliente", () => {
  expect(publicErrorMessage(new Error("The string did not match the expected pattern."), "Falha segura.")).toBe("Falha segura.");
  expect(publicErrorMessage(new Error("Failed to fetch"), "Falha segura.")).toBe("Falha segura.");
  expect(publicErrorMessage(new Error("Something went wrong"), "Falha segura.")).toBe("Falha segura.");
});

test("mensagens portuguesas de negocio podem ser preservadas", () => {
  expect(publicErrorMessage(new Error("Este vídeo ultrapassa o limite de 30 segundos."))).toBe("Este vídeo ultrapassa o limite de 30 segundos.");
});

test("upload de video usa fallback claro e preserva cadastro", () => {
  expect(videoUploadErrorMessage(new DOMException("The string did not match the expected pattern."))).toContain("Seu cadastro foi preservado");
});
