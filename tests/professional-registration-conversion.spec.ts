import { expect, test } from "@playwright/test";
import { cadastroHrefForRole } from "../src/lib/account-routes";
import {
  createPendingProfessionalPhoneToken,
  verifyPendingProfessionalPhoneToken,
} from "../src/lib/phone-otp";

const MOBILE_WIDTHS = [320, 360, 375, 390, 393, 414, 430, 768, 1024];

function colorChannels(value: string) {
  const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return {
    red: channels[0] ?? 0,
    green: channels[1] ?? 0,
    blue: channels[2] ?? 0,
    alpha: channels[3] ?? 1,
  };
}

function contrastRatio(foreground: string, background: string) {
  const fg = colorChannels(foreground);
  const bg = colorChannels(background);
  const composite = [fg.red, fg.green, fg.blue].map(
    (channel, index) => channel * fg.alpha + [bg.red, bg.green, bg.blue][index] * (1 - fg.alpha),
  );
  const luminance = (channels: number[]) => {
    const linear = channels.map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const foregroundLuminance = luminance(composite);
  const backgroundLuminance = luminance([bg.red, bg.green, bg.blue]);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

test("rota profissional pública sempre começa na landing", () => {
  expect(cadastroHrefForRole("profissional")).toBe("/cadastro/acompanhante");
});

test("pré-validação do telefone usa token assinado e rejeita adulteração", () => {
  const token = createPendingProfessionalPhoneToken("31999999999", "verification-test");
  expect(verifyPendingProfessionalPhoneToken(token)).toMatchObject({
    phone: "31999999999",
    verificationId: "verification-test",
  });
  expect(verifyPendingProfessionalPhoneToken(`${token}alterado`)).toBeNull();
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("elite_modell_adult_consent_session", "accepted");
    localStorage.setItem("elite_modell_ageConsentAccepted", "true");
    localStorage.setItem("elite_cookie_consent", "necessary");
  });
});

test("apresenta a experiência premium e validação por canal", async ({ page }) => {
  await page.route("**/api/auth/phone/send-code", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "Código enviado por SMS" }),
    });
  });
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Cadastre-se grátis como acompanhante" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ferramentas para você brilhar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Valide seu telefone para continuar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quanto você pode faturar?" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("fatalmodel");
  if (process.env.TWILIO_WHATSAPP_VERIFY_ENABLED === "true") {
    await expect(page.getByRole("radio", { name: /WhatsApp/i }).first()).toBeVisible();
  } else {
    await expect(page.getByRole("radio", { name: /WhatsApp/i })).toBeDisabled();
    await expect(page.getByText("Em breve", { exact: true })).toBeVisible();
  }

  await expect(page.getByRole("button", { name: /^Enviar código$/ })).toBeDisabled();
  await page.getByLabel("Seu número de telefone").fill("31999999999");
  await page.getByLabel(/Confirmo que tenho 18 anos ou mais/).check();
  await page.getByRole("button", { name: /^Enviar código$/ }).click();

  await expect(
    page.getByRole("heading", { name: "Valide seu telefone para continuar" }),
  ).toBeVisible();
  await expect(page.getByLabel("Código de 6 dígitos")).toBeVisible();
});

test("telefone permanece legível e sem overflow nos viewports críticos", async ({ page }) => {
  for (const width of MOBILE_WIDTHS) {
    await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
    await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });

    const phoneInput = page.getByLabel("Seu número de telefone");
    await phoneInput.fill("31999999999");
    await expect(phoneInput).toHaveValue("(31) 99999-9999");
    await expect(phoneInput).toHaveAttribute("type", "tel");
    await expect(phoneInput).toHaveAttribute("inputmode", "numeric");
    await expect(phoneInput).toHaveAttribute("autocomplete", "tel");

    const styles = await phoneInput.evaluate((element) => {
      const input = getComputedStyle(element);
      const placeholder = getComputedStyle(element, "::placeholder");
      const shell = getComputedStyle(element.parentElement as HTMLElement);
      const prefix = getComputedStyle(element.previousElementSibling as HTMLElement);
      return {
        color: input.color,
        textFillColor: input.webkitTextFillColor,
        caretColor: input.caretColor,
        fontSize: Number.parseFloat(input.fontSize),
        placeholderColor: placeholder.color,
        backgroundColor: shell.backgroundColor,
        prefixColor: prefix.color,
      };
    });

    expect(contrastRatio(styles.color, styles.backgroundColor)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(styles.textFillColor, styles.backgroundColor)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(styles.placeholderColor, styles.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(styles.prefixColor, styles.backgroundColor)).toBeGreaterThanOrEqual(7);
    expect(styles.caretColor).not.toBe(styles.backgroundColor);
    expect(styles.fontSize).toBeGreaterThanOrEqual(16);

    if ([375, 390, 430].includes(width)) {
      const validationSection = page.getByRole("region", { name: "Valide seu telefone para continuar" });
      await expect(validationSection.getByRole("radio", { name: /SMS/i })).toBeVisible();
      await expect(validationSection.getByLabel(/Confirmo que tenho 18 anos ou mais/)).toBeVisible();
      await expect(validationSection.getByRole("button", { name: /^Enviar código$/ })).toBeVisible();

      const hierarchy = await page.evaluate(() => {
        const validation = document.querySelector<HTMLElement>('section[aria-labelledby="validation-title"]');
        const benefits = document.querySelector<HTMLElement>('section[aria-labelledby="benefits-title"]');
        const simulator = document.querySelector<HTMLElement>('section[aria-labelledby="simulator-title"]');
        const checkbox = validation?.querySelector<HTMLInputElement>('input[type="checkbox"]');
        const cta = validation?.querySelector<HTMLButtonElement>('button:not([role="radio"])');
        return {
          validationTop: validation?.offsetTop ?? 0,
          validationBottom: (validation?.offsetTop ?? 0) + (validation?.offsetHeight ?? 0),
          benefitsTop: benefits?.offsetTop ?? 0,
          simulatorTop: simulator?.offsetTop ?? 0,
          checkboxTop: checkbox?.getBoundingClientRect().top ?? 0,
          ctaTop: cta?.getBoundingClientRect().top ?? 0,
        };
      });
      expect(hierarchy.ctaTop).toBeGreaterThan(hierarchy.checkboxTop);
      expect(hierarchy.benefitsTop).toBeGreaterThanOrEqual(hierarchy.validationBottom);
      expect(hierarchy.simulatorTop).toBeGreaterThan(hierarchy.benefitsTop);

      if (width === 390) {
        await validationSection.getByLabel(/Confirmo que tenho 18 anos ou mais/).check();
        await validationSection.screenshot({
          path: "artifacts/visual-review/professional-registration-first-step-reorganized.png",
        });
      }
    }

    const layout = await page.evaluate(() => {
      const back = document.querySelector<HTMLAnchorElement>('a[href="/"]');
      const logo = document.querySelector<HTMLImageElement>('a[aria-label*="Elite Modell"] img');
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        backText: back?.textContent?.trim(),
        backFontSize: back ? Number.parseFloat(getComputedStyle(back).fontSize) : 0,
        backRight: back?.getBoundingClientRect().right ?? 0,
        logoOpacity: logo ? Number.parseFloat(getComputedStyle(logo).opacity) : 0,
        logoFilter: logo ? getComputedStyle(logo).filter : "missing",
        decorativeHeroIcon: Boolean(document.querySelector('[aria-labelledby="professional-register-title"] > span svg')),
      };
    });
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(layout.backText).toBe("Voltar");
    expect(layout.backFontSize).toBeGreaterThanOrEqual(11);
    expect(layout.backRight).toBeLessThanOrEqual(width);
    expect(layout.logoOpacity).toBe(1);
    expect(layout.logoFilter).toBe("none");
    expect(layout.decorativeHeroIcon).toBe(false);
  }

  const hasScopedAutofillProtection = await page.evaluate(() => {
    const rules = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules, (rule) => rule.cssText);
      } catch {
        return [];
      }
    });
    return rules.some(
      (rule) => rule.includes("input:-webkit-autofill") && rule.includes("-webkit-text-fill-color"),
    );
  });
  expect(hasScopedAutofillProtection).toBe(true);
});

test("formulários públicos principais mantêm texto legível no mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const routes = ["/login?role=cliente", "/esqueci-senha", "/cadastro?tipo=cliente"];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const inputs = page.locator(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="hidden"])',
    );
    await expect(
      inputs.first(),
      `A rota ${route} deve renderizar ao menos um campo textual visível`,
    ).toBeVisible();
    const count = await inputs.count();
    let visibleCount = 0;

    for (let index = 0; index < count; index += 1) {
      const input = inputs.nth(index);
      if (!(await input.isVisible())) continue;
      visibleCount += 1;
      const styles = await input.evaluate((element) => {
        const inputStyle = getComputedStyle(element);
        const placeholder = getComputedStyle(element, "::placeholder");
        let backgroundElement: Element | null = element;
        let backgroundColor = inputStyle.backgroundColor;
        while (backgroundElement?.parentElement && colorChannelsForBrowser(backgroundColor).alpha < 0.9) {
          backgroundElement = backgroundElement.parentElement;
          backgroundColor = getComputedStyle(backgroundElement).backgroundColor;
        }
        return {
          color: inputStyle.color,
          textFillColor: inputStyle.webkitTextFillColor,
          fontSize: Number.parseFloat(inputStyle.fontSize),
          backgroundColor,
          placeholder: element.getAttribute("placeholder") ? placeholder.color : null,
        };

        function colorChannelsForBrowser(value: string) {
          const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
          return { alpha: channels[3] ?? (channels.length >= 3 ? 1 : 0) };
        }
      });
      expect(styles.fontSize, `${route}, campo ${index}`).toBeGreaterThanOrEqual(16);
      expect(contrastRatio(styles.color, styles.backgroundColor), `${route}, campo ${index}`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(styles.textFillColor, styles.backgroundColor), `${route}, campo ${index}`).toBeGreaterThanOrEqual(4.5);
      if (styles.placeholder) {
        expect(contrastRatio(styles.placeholder, styles.backgroundColor), `${route}, placeholder ${index}`).toBeGreaterThanOrEqual(4.5);
      }

      await input.focus();
      const focusedColor = await input.evaluate((element) => getComputedStyle(element).color);
      expect(contrastRatio(focusedColor, styles.backgroundColor), `${route}, foco ${index}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(visibleCount, `Nenhum campo textual visível em ${route}`).toBeGreaterThan(0);
  }
});

test("envia código profissional somente por SMS", async ({ page }) => {
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/auth/phone/send-code", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "Código enviado por SMS" }),
    });
  });
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Seu número de telefone").fill("31999999999");
  await page.getByLabel(/Confirmo que tenho 18 anos ou mais/).check();
  await page.getByRole("button", { name: /^Enviar código$/ }).click();

  const codeInput = page.getByLabel("Código de 6 dígitos");
  await expect(codeInput).toBeVisible();
  await expect(codeInput).toHaveAttribute("inputmode", "numeric");
  await expect(codeInput).toHaveAttribute("autocomplete", "one-time-code");
  await expect(codeInput).toHaveAttribute("maxlength", "6");
  await codeInput.fill("123456");
  await expect(codeInput).toHaveValue("123456");
  const codeStyles = await codeInput.evaluate((element) => {
    const input = getComputedStyle(element);
    return {
      color: input.color,
      textFillColor: input.webkitTextFillColor,
      caretColor: input.caretColor,
      backgroundColor: input.backgroundColor,
      fontSize: Number.parseFloat(input.fontSize),
    };
  });
  expect(contrastRatio(codeStyles.color, codeStyles.backgroundColor)).toBeGreaterThanOrEqual(7);
  expect(contrastRatio(codeStyles.textFillColor, codeStyles.backgroundColor)).toBeGreaterThanOrEqual(7);
  expect(codeStyles.caretColor).not.toBe(codeStyles.backgroundColor);
  expect(codeStyles.fontSize).toBeGreaterThanOrEqual(16);
  expect(payload).toMatchObject({
    phone: "31999999999",
    accountType: "model",
    channel: "sms",
  });
});

test("falha no WhatsApp oferece fallback explícito por SMS", async ({ page }) => {
  test.skip(
    process.env.TWILIO_WHATSAPP_VERIFY_ENABLED !== "true",
    "Executado no cenário com a feature flag de WhatsApp ativa.",
  );

  const channels: string[] = [];
  await page.route("**/api/auth/phone/send-code", async (route) => {
    const payload = route.request().postDataJSON() as { channel?: string };
    channels.push(payload.channel ?? "");
    if (payload.channel === "whatsapp") {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "WHATSAPP_SENDER_ERROR",
          error: "Não foi possível enviar pelo WhatsApp. Você pode receber o código por SMS.",
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "Código enviado por SMS" }),
    });
  });

  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Seu número de telefone").fill("31999999999");
  await page.getByRole("radio", { name: /WhatsApp/i }).first().click();
  await page.getByLabel("Quero receber meu código de verificação pelo WhatsApp.").first().check();
  await page.getByLabel(/Confirmo que tenho 18 anos ou mais/).check();
  await page.getByRole("button", { name: /^Enviar código$/ }).click();

  await expect(
    page.getByRole("region", { name: /Valide seu telefone para continuar/ }).getByRole("alert"),
  ).toContainText("Você pode receber o código por SMS");
  await page.getByRole("button", { name: "Enviar por SMS" }).click();
  await expect(page.getByLabel("Código de 6 dígitos")).toBeVisible();
  expect(channels).toEqual(["whatsapp", "sms"]);
});

test("HTML inesperado da API mostra erro amigável sem quebrar a tela", async ({ page }) => {
  await page.route("**/api/auth/phone/send-code", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "text/html",
      body: "<!DOCTYPE html><html><body>erro interno</body></html>",
    });
  });
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Seu número de telefone").fill("31999999999");
  await page.getByLabel(/Confirmo que tenho 18 anos ou mais/).check();
  await page.getByRole("button", { name: /^Enviar código$/ }).click();

  await expect(page.getByText("Não foi possível enviar o código agora. Tente novamente.")).toBeVisible();
  await expect(page.getByLabel("Código de 6 dígitos")).toHaveCount(0);
});

test("após validar o código abre a ativação profissional completa", async ({ page }) => {
  await page.route("**/api/auth/phone/send-code", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, message: "Código enviado por SMS" }),
    });
  });
  await page.route("**/api/auth/phone/verify-code", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      phone: "31999999999",
      code: "123456",
      accountType: "model",
      deferAccountCreation: true,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        registrationPending: true,
        redirectTo: "/cadastro?tipo=acompanhante&telefoneValidado=1",
      }),
    });
  });
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });

  await page.getByLabel("Seu número de telefone").fill("31999999999");
  await page.getByLabel(/Confirmo que tenho 18 anos ou mais/).check();
  await page.getByRole("button", { name: /^Enviar código$/ }).click();
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Validar e continuar" }).click();

  await page.waitForURL(/\/cadastro\?tipo=acompanhante&telefoneValidado=1/);
  await expect(page.getByText("Cadastro de acompanhante +18", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastrar com Google" })).toHaveCount(0);
  await expect(page.getByPlaceholder("seu@email.com")).toBeVisible();
  const womanCategory = page.getByRole("button", { name: "Mulher" });
  await womanCategory.click();
  await expect(womanCategory).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Mostrar senha" })).toBeVisible();
  await page.getByPlaceholder("Mínimo 6 caracteres").fill("senha123");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(page.getByPlaceholder("Mínimo 6 caracteres")).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Ocultar senha" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Data de nascimento", { exact: true })).toBeVisible();
  for (const step of ["Dados", "Aparência", "Atendimento", "Serviços", "Valores", "Contato", "Fotos", "Verificação", "Enviar"]) {
    await expect(page.locator("body")).toContainText(step);
  }
});

test("cadastro profissional por email envia link e entra direto no onboarding em rascunho", async ({ page }) => {
  const captured: { signupPayload?: Record<string, unknown>; nextAuthPayload?: string | null } = {};

  await page.route("**/api/auth/email-signup", async (route) => {
    captured.signupPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        draftSessionToken: "draft-token-for-tests",
        continueTo: "/profissional/novo",
      }),
    });
  });
  await page.route("**/api/auth/csrf**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "csrf-token-for-tests" }),
    });
  });
  await page.route("**/api/auth/callback/email-signup-draft**", async (route) => {
    captured.nextAuthPayload = route.request().postData();
    const url = new URL("/profissional/novo", route.request().url()).toString();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url }),
    });
  });
  await page.route("**/profissional/novo**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body><h1>Criar perfil de acompanhante</h1></body></html>",
    });
  });

  await page.goto("/cadastro?tipo=acompanhante&telefoneValidado=1", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Mulher" }).click();
  await page.getByPlaceholder("Seu nome").fill("Cadastro Profissional Teste");
  await page.getByPlaceholder("seu@email.com").fill("profissional-teste@elitemodell.local");
  await page.getByPlaceholder("Mínimo 6 caracteres").fill("senha123");
  await page.getByLabel("Dia de nascimento").fill("01");
  await page.getByLabel("Mês de nascimento").fill("01");
  await page.getByLabel("Ano de nascimento").fill("1995");
  await page.getByLabel(/Termos de Uso/).check();
  await page.getByLabel(/Política de Privacidade/).check();
  await page.getByLabel(/Confirmo que sou maior de 18 anos/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();

  await page.waitForURL(/\/profissional\/novo/);
  await expect(page.getByRole("heading", { name: "Criar perfil de acompanhante" })).toBeVisible();
  expect(captured.nextAuthPayload).toContain("draft-token-for-tests");

  expect(captured.signupPayload).toMatchObject({
    accountType: "PROFESSIONAL",
    category: "MULHER",
    birthDate: "1995-01-01",
    lgpdConsent: true,
    termsConsent: true,
    ageConfirmed: true,
  });

  const redirectTo = new URL(String(captured.signupPayload?.redirectTo));
  expect(redirectTo.pathname).toBe("/auth/callback");
  expect(redirectTo.searchParams.get("role")).toBe("profissional");
  expect(redirectTo.searchParams.get("flow")).toBe("cadastro");
  expect(redirectTo.searchParams.get("intent")).toBe("professional-signup");
  expect(redirectTo.searchParams.get("returnUrl")).toBe("/profissional/novo");
});

test("não cria rolagem horizontal no mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cadastro/acompanhante", { waitUntil: "domcontentloaded" });

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("conta profissional mantém seleção, senha e checkboxes responsivos", async ({ page }) => {
  for (const width of [375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/cadastro?tipo=acompanhante&telefoneValidado=1", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: "Cadastrar com Google" })).toHaveCount(0);
    const category = page.getByRole("button", { name: "Trans" });
    await category.click();
    await expect(category).toHaveAttribute("aria-pressed", "true");

    const password = page.getByPlaceholder("Mínimo 6 caracteres");
    await password.fill("senha-segura");
    await page.getByRole("button", { name: "Mostrar senha" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ocultar senha" }).click();
    await expect(password).toHaveAttribute("type", "password");

    const terms = page.getByLabel(/Termos de Uso/);
    await terms.check();
    await expect(terms).toBeChecked();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  }
});
