"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { isAgeOfMajority, isValidBirthDate } from "@/lib/age-validation";

type BirthPart = "day" | "month" | "year";

const GOLD = "#d4a843";

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function pad(value: string) {
  return value.padStart(2, "0");
}

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function composeBirthDate(day: string, month: string, year: string) {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return "";
  return `${year}-${pad(month)}-${pad(day)}`;
}

function validateDateParts(day: string, month: string, year: string) {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return "Complete sua data de nascimento";
  }

  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (dayNumber < 1 || dayNumber > 31) return "Dia inválido";
  if (monthNumber < 1 || monthNumber > 12) return "Mês inválido";
  if (yearNumber < 1900) return "Ano inválido";
  if (dayNumber > daysInMonth(monthNumber, yearNumber)) return "Dia inválido para este mês";

  return "";
}

export default function AgeGate() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("age_verified_session");
  });
  const [birthParts, setBirthParts] = useState<Record<BirthPart, string>>({
    day: "",
    month: "",
    year: "",
  });
  const [error, setError] = useState("");
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  function completeWithDate(date: string) {
    if (!isValidBirthDate(date)) {
      setError("Data de nascimento inválida");
      return;
    }

    if (!isAgeOfMajority(date)) {
      setError("Você deve ter 18 anos ou mais");
      return;
    }

    sessionStorage.setItem("age_verified_session", "1");
    sessionStorage.setItem("age_verified_date", new Date().toISOString());
    setVisible(false);
  }

  function tryComplete(parts: Record<BirthPart, string>) {
    const partError = validateDateParts(parts.day, parts.month, parts.year);
    if (partError) {
      if (parts.year.length === 4) setError(partError);
      return;
    }

    completeWithDate(composeBirthDate(parts.day, parts.month, parts.year));
  }

  function handleBirthPartChange(part: BirthPart, value: string) {
    const maxLength = part === "year" ? 4 : 2;
    const cleaned = onlyDigits(value, maxLength);
    const nextParts = { ...birthParts, [part]: cleaned };

    setBirthParts(nextParts);
    setError("");

    if (part === "day" && cleaned.length === 2) {
      const dayNumber = Number(cleaned);
      if (dayNumber < 1 || dayNumber > 31) {
        setError("Dia inválido");
        return;
      }
      monthRef.current?.focus();
    }

    if (part === "month" && cleaned.length === 2) {
      const monthNumber = Number(cleaned);
      if (monthNumber < 1 || monthNumber > 12) {
        setError("Mês inválido");
        return;
      }
      yearRef.current?.focus();
    }

    if (part === "year" && cleaned.length === 4) {
      tryComplete(nextParts);
    }
  }

  function handleKeyDown(part: BirthPart, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace") return;
    if (part === "month" && birthParts.month.length === 0) dayRef.current?.focus();
    if (part === "year" && birthParts.year.length === 0) monthRef.current?.focus();
  }

  function handleConfirm() {
    const partError = validateDateParts(birthParts.day, birthParts.month, birthParts.year);
    if (partError) {
      setError(partError);
      if (birthParts.day.length < 2) dayRef.current?.focus();
      else if (birthParts.month.length < 2) monthRef.current?.focus();
      else yearRef.current?.focus();
      return;
    }

    completeWithDate(composeBirthDate(birthParts.day, birthParts.month, birthParts.year));
  }

  function handleDeny() {
    window.location.href = "https://www.google.com";
  }

  if (!visible) return null;

  return (
    <div className="age-gate">
      <div className="age-card">
        <div className="gold-line" />

        <div className="age-content">
          <div className="age-logo">
            <span>
              <span>elite</span>
              modell
            </span>
          </div>

          <div className="adult-badge">18+</div>

          <h2>Conteúdo para adultos</h2>
          <p className="age-intro">Este site é destinado exclusivamente a maiores de 18 anos.</p>

          <div className="date-block">
            <label className="date-label" htmlFor="birth-day">
              Data de nascimento
            </label>
            <div className="birth-row" aria-label="Data de nascimento">
              <input
                ref={dayRef}
                id="birth-day"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="bday-day"
                maxLength={2}
                placeholder="DD"
                value={birthParts.day}
                onChange={(event) => handleBirthPartChange("day", event.target.value)}
                aria-label="Dia de nascimento"
              />
              <input
                ref={monthRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="bday-month"
                maxLength={2}
                placeholder="MM"
                value={birthParts.month}
                onChange={(event) => handleBirthPartChange("month", event.target.value)}
                onKeyDown={(event) => handleKeyDown("month", event)}
                aria-label="Mês de nascimento"
              />
              <input
                ref={yearRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="bday-year"
                maxLength={4}
                placeholder="AAAA"
                value={birthParts.year}
                onChange={(event) => handleBirthPartChange("year", event.target.value)}
                onKeyDown={(event) => handleKeyDown("year", event)}
                aria-label="Ano de nascimento"
              />
            </div>
            {error ? <p className="date-error">{error}</p> : null}
          </div>

          <button className="continue-button" onClick={handleConfirm} type="button">
            Continuar
          </button>

          <button className="deny-button" onClick={handleDeny} type="button">
            Não tenho 18 anos
          </button>

          <p className="legal-copy">
            Ao continuar, você confirma sua maioridade e concorda com nossos{" "}
            <a href="/terms">Termos de Uso</a> e <a href="/privacy">Política de Privacidade</a>.
          </p>
        </div>
      </div>

      <style jsx>{`
        .age-gate {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background:
            radial-gradient(circle at 50% 0%, rgba(212, 168, 67, 0.08), transparent 34%),
            rgba(3, 3, 3, 0.985);
          color: #f1f5f9;
        }

        .age-card {
          width: min(100%, 430px);
          max-height: min(92svh, 680px);
          overflow-y: auto;
          border: 1px solid rgba(212, 168, 67, 0.22);
          border-radius: 20px;
          background: rgba(8, 9, 10, 0.96);
          box-shadow: 0 32px 90px rgba(0, 0, 0, 0.68);
        }

        .gold-line {
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, ${GOLD} 32%, #f5d78c 50%, ${GOLD} 68%, transparent 100%);
        }

        .age-content {
          padding: 28px 24px 24px;
          text-align: center;
        }

        .age-logo {
          position: relative;
          display: inline-flex;
          margin-bottom: 22px;
          padding: 7px 18px;
          border: 1px solid rgba(212, 168, 67, 0.28);
          border-radius: 10px;
          background: rgba(212, 168, 67, 0.045);
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0;
        }

        .age-logo span span {
          background: linear-gradient(135deg, #ffe5a0 0%, #d4a843 28%, #f5d78c 55%, #9e7b2a 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .adult-badge {
          display: grid;
          width: 70px;
          height: 70px;
          margin: 0 auto 18px;
          place-items: center;
          border: 2px solid ${GOLD};
          border-radius: 999px;
          background: rgba(212, 168, 67, 0.05);
          color: ${GOLD};
          font-size: 27px;
          font-weight: 900;
          box-shadow: 0 0 32px rgba(212, 168, 67, 0.11);
        }

        h2 {
          margin: 0 0 8px;
          color: #f8fafc;
          font-size: 20px;
          font-weight: 850;
          letter-spacing: 0;
        }

        .age-intro {
          margin: 0 0 22px;
          color: #9aa3af;
          font-size: 13px;
          line-height: 1.6;
        }

        .date-block {
          margin-bottom: 16px;
          text-align: left;
        }

        .date-label {
          display: block;
          margin-bottom: 8px;
          color: #b8b1a6;
          font-size: 13px;
          font-weight: 700;
        }

        .birth-row {
          display: grid;
          grid-template-columns: 0.72fr 0.72fr 1fr;
          gap: 8px;
        }

        .birth-row input {
          width: 100%;
          height: 56px;
          box-sizing: border-box;
          border: 1px solid rgba(212, 168, 67, 0.18);
          border-radius: 10px;
          background: rgba(17, 17, 17, 0.94);
          color: #f4f1ea;
          outline: none;
          text-align: center;
          font-size: 19px;
          font-weight: 850;
          letter-spacing: 0;
          transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }

        .birth-row input::placeholder {
          color: #74706a;
        }

        .birth-row input:focus {
          border-color: rgba(212, 168, 67, 0.72);
          background: rgba(212, 168, 67, 0.08);
          box-shadow: 0 0 0 3px rgba(212, 168, 67, 0.08);
        }

        .date-error {
          margin: 8px 0 0;
          color: #ef4444;
          font-size: 12px;
        }

        .continue-button,
        .deny-button {
          width: 100%;
          border: 0;
          border-radius: 12px;
          cursor: pointer;
        }

        .continue-button {
          min-height: 52px;
          margin-top: 2px;
          background: linear-gradient(135deg, #ffe08b 0%, ${GOLD} 58%, #b98c2e 100%);
          color: #060606;
          font-size: 15px;
          font-weight: 900;
        }

        .deny-button {
          min-height: 42px;
          margin-top: 8px;
          background: transparent;
          color: #6d6760;
          font-size: 13px;
          font-weight: 700;
        }

        .legal-copy {
          margin: 14px 0 0;
          color: #746d64;
          font-size: 11px;
          line-height: 1.6;
        }

        .legal-copy a {
          color: #c9a84c;
          text-decoration: none;
        }

        @media (max-width: 520px) {
          .age-gate {
            align-items: center;
            padding: 14px;
          }

          .age-card {
            width: min(100%, 390px);
            max-height: 88svh;
            border-radius: 18px;
          }

          .age-content {
            padding: 22px 18px 18px;
          }

          .age-logo {
            margin-bottom: 18px;
            font-size: 21px;
          }

          .adult-badge {
            width: 62px;
            height: 62px;
            margin-bottom: 16px;
            font-size: 24px;
          }

          .age-intro {
            margin-bottom: 18px;
          }

          .birth-row {
            gap: 7px;
          }

          .birth-row input {
            height: 52px;
            border-radius: 9px;
            font-size: 17px;
          }
        }
      `}</style>
    </div>
  );
}
