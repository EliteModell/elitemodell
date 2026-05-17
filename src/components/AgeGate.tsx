"use client";

import { useRef, useState } from "react";
import { isAgeOfMajority, isValidBirthDate } from "@/lib/age-validation";

type PickerStep = "day" | "month" | "year";

const GOLD = "#d4a843";
const months = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function daysInMonth(month: number | null, year: number | null) {
  if (!month) return 31;
  return new Date(year ?? 2000, month, 0).getDate();
}

function composeBirthDate(day: number | null, month: number | null, year: number | null) {
  if (!day || !month || !year) return "";
  return `${year}-${pad(month)}-${pad(day)}`;
}

export default function AgeGate() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("age_verified_session");
  });
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState<PickerStep>("day");
  const [dayInput, setDayInput] = useState("");
  const [month, setMonth] = useState<number | null>(null);
  const [yearInput, setYearInput] = useState("");
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const dayReady = dayInput.length === 2 && Number(dayInput) >= 1 && Number(dayInput) <= 31;

  function selectMonth(value: number) {
    setMonth(value);
    setError("");
    setActiveStep("year");
    window.setTimeout(() => yearRef.current?.focus(), 80);
    tryComplete(dayInput, value, yearInput);
  }

  function composeFromParts(nextDay = dayInput, nextMonth = month, nextYear = yearInput) {
    if (nextDay.length !== 2 || !nextMonth || nextYear.length !== 4) return "";
    return composeBirthDate(Number(nextDay), nextMonth, Number(nextYear));
  }

  function completeWithDate(date: string) {
    if (!isValidBirthDate(date)) {
      setError("Data de nascimento invalida");
      return;
    }

    if (!isAgeOfMajority(date)) {
      setError("Voce deve ter 18 anos ou mais");
      return;
    }

    sessionStorage.setItem("age_verified_session", "1");
    sessionStorage.setItem("age_verified_date", new Date().toISOString());
    setVisible(false);
  }

  function tryComplete(nextDay = dayInput, nextMonth = month, nextYear = yearInput) {
    const date = composeFromParts(nextDay, nextMonth, nextYear);
    if (!date) return;
    setBirthDate(date);
    completeWithDate(date);
  }

  function handleDayChange(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 2);
    setDayInput(clean);
    setError("");
    setBirthDate("");

    if (clean.length === 2) {
      const numericDay = Number(clean);
      if (numericDay < 1 || numericDay > 31) {
        setError("Dia invalido");
        return;
      }
      setActiveStep("month");
      window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>("[data-month-index='0']")?.focus();
      }, 80);
    }
  }

  function handleYearChange(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 4);
    setYearInput(clean);
    setError("");

    if (clean.length === 4) {
      if (!month) {
        setActiveStep("month");
        setError("Escolha o mes");
        return;
      }

      const numericDay = Number(dayInput);
      if (numericDay > daysInMonth(month, Number(clean))) {
        setError("Dia invalido para este mes");
        setActiveStep("day");
        window.setTimeout(() => dayRef.current?.focus(), 80);
        return;
      }

      tryComplete(dayInput, month, clean);
    }
  }

  function handleConfirm() {
    const date = birthDate || composeFromParts();
    if (!date) {
      setError("Complete sua data de nascimento");
      if (dayInput.length < 2) {
        setActiveStep("day");
        dayRef.current?.focus();
      } else if (!month) {
        setActiveStep("month");
      } else {
        setActiveStep("year");
        yearRef.current?.focus();
      }
      return;
    }

    completeWithDate(date);
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

          <h2>Conteudo para adultos</h2>
          <p className="age-intro">Este site e destinado exclusivamente a maiores de 18 anos.</p>

          <div className="date-block">
            <span className="date-label">Data de nascimento</span>
            <div className="birth-flow" aria-label="Data de nascimento">
              <div className={`birth-field ${activeStep === "day" ? "active" : ""}`}>
                <label htmlFor="birth-day">Dia</label>
                <input
                  ref={dayRef}
                  id="birth-day"
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-day"
                  maxLength={2}
                  placeholder="DD"
                  value={dayInput}
                  onChange={(event) => handleDayChange(event.target.value)}
                  onFocus={() => setActiveStep("day")}
                />
              </div>

              <div className={`month-field ${activeStep === "month" ? "active" : ""} ${dayReady ? "" : "disabled"}`}>
                <label>Mes</label>
                <div className="month-strip">
                  {months.map((item, index) => (
                    <button
                      key={item}
                      type="button"
                      data-month-index={index}
                      disabled={!dayReady}
                      className={month === index + 1 ? "selected" : ""}
                      onClick={() => selectMonth(index + 1)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`birth-field ${activeStep === "year" ? "active" : ""}`}>
                <label htmlFor="birth-year">Ano</label>
                <input
                  ref={yearRef}
                  id="birth-year"
                  type="text"
                  inputMode="numeric"
                  autoComplete="bday-year"
                  maxLength={4}
                  placeholder="AAAA"
                  value={yearInput}
                  disabled={!month}
                  onChange={(event) => handleYearChange(event.target.value)}
                  onFocus={() => setActiveStep("year")}
                />
              </div>

              <div className="birth-preview">
                {dayInput.length === 2 ? dayInput : "DD"} / {month ? months[month - 1] : "Mes"} / {yearInput || "AAAA"}
              </div>
            </div>
            {error ? <p className="date-error">{error}</p> : null}
          </div>

          <button className="continue-button" onClick={handleConfirm} type="button">
            Continuar
          </button>

          <button className="deny-button" onClick={handleDeny} type="button">
            Nao tenho 18 anos
          </button>

          <p className="legal-copy">
            Ao continuar, voce confirma sua maioridade e concorda com nossos{" "}
            <a href="/terms">Termos de Uso</a> e <a href="/privacy">Politica de Privacidade</a>.
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
            rgba(3, 8, 16, 0.985);
          color: #f1f5f9;
        }

        .age-card {
          width: min(100%, 420px);
          max-height: min(94vh, 760px);
          overflow: hidden;
          border: 1px solid rgba(212, 168, 67, 0.2);
          border-radius: 22px;
          background: rgba(9, 18, 31, 0.96);
          box-shadow: 0 32px 90px rgba(0, 0, 0, 0.68);
        }

        .gold-line {
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, ${GOLD} 32%, #f5d78c 50%, ${GOLD} 68%, transparent 100%);
        }

        .age-content {
          padding: 30px 24px 24px;
          text-align: center;
        }

        .age-logo {
          position: relative;
          display: inline-flex;
          margin-bottom: 24px;
          padding: 7px 18px;
          border: 1px solid rgba(212, 168, 67, 0.28);
          border-radius: 10px;
          background: rgba(212, 168, 67, 0.045);
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.5px;
        }

        .age-logo span span {
          background: linear-gradient(135deg, #ffe5a0 0%, #d4a843 28%, #f5d78c 55%, #9e7b2a 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .adult-badge {
          display: grid;
          width: 72px;
          height: 72px;
          margin: 0 auto 20px;
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
          color: #7f8ea4;
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
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
        }

        .date-error {
          margin: 8px 0 0;
          color: #ef4444;
          font-size: 12px;
        }

        .birth-flow {
          display: grid;
          gap: 10px;
        }

        .birth-field,
        .month-field {
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.92);
          padding: 11px;
          transition: border-color 0.18s ease, background 0.18s ease;
        }

        .birth-field.active,
        .month-field.active {
          border-color: rgba(212, 168, 67, 0.55);
          background: rgba(212, 168, 67, 0.075);
        }

        .month-field.disabled {
          opacity: 0.42;
        }

        .birth-field label,
        .month-field label {
          display: block;
          margin-bottom: 7px;
          color: ${GOLD};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.35px;
          text-transform: uppercase;
        }

        .birth-field input {
          width: 100%;
          height: 45px;
          border: 0;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.045);
          color: #f8fafc;
          outline: none;
          text-align: center;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 1.6px;
        }

        .birth-field input:disabled {
          color: #334155;
        }

        .month-strip {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 7px;
        }

        .month-strip button {
          min-height: 38px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.045);
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .month-strip button:active {
          transform: scale(0.95);
        }

        .month-strip button.selected {
          border-color: rgba(212, 168, 67, 0.62);
          background: linear-gradient(135deg, rgba(255, 224, 139, 0.34), rgba(212, 168, 67, 0.18));
          color: #fff4c7;
        }

        .month-strip button:disabled {
          cursor: default;
        }

        .birth-preview {
          min-height: 34px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .continue-button,
        .deny-button {
          width: 100%;
          border: 0;
          border-radius: 12px;
          cursor: pointer;
        }

        .continue-button {
          min-height: 50px;
          margin-top: 2px;
          background: linear-gradient(135deg, #ffe08b 0%, ${GOLD} 58%, #b98c2e 100%);
          color: #060e1b;
          font-size: 15px;
          font-weight: 900;
        }

        .deny-button {
          min-height: 42px;
          margin-top: 8px;
          background: transparent;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
        }

        .legal-copy {
          margin: 16px 0 0;
          color: #56657a;
          font-size: 11px;
          line-height: 1.6;
        }

        .legal-copy a {
          color: #c9a84c;
          text-decoration: none;
        }

        @keyframes stageIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 520px) {
          .age-gate {
            align-items: center;
            padding: 14px;
          }

          .age-card {
            max-height: 92vh;
            overflow-y: auto;
            border-radius: 20px;
          }

          .age-content {
            padding: 24px 18px 20px;
          }

          .adult-badge {
            width: 64px;
            height: 64px;
            margin-bottom: 16px;
            font-size: 24px;
          }

          .age-logo {
            margin-bottom: 20px;
          }

          .month-strip {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .birth-field input {
            height: 42px;
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
