"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { isAgeOfMajority, isValidBirthDate, getMaxBirthDate } from "@/lib/age-validation";

type PickerStep = "day" | "month" | "year";

const GOLD = "#d4a843";
const months = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
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

function displayBirthDate(day: number | null, month: number | null, year: number | null) {
  if (!day || !month || !year) return "Selecione sua data";
  return `${pad(day)} de ${months[month - 1]} de ${year}`;
}

export default function AgeGate() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("age_verified_session");
  });
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<PickerStep>("day");
  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);

  const maxDate = getMaxBirthDate();
  const maxBirth = useMemo(() => new Date(`${maxDate}T12:00:00`), [maxDate]);
  const dayOptions = useMemo(() => {
    const total = daysInMonth(month, year);
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [month, year]);
  const yearOptions = useMemo(() => {
    const selectedMonth = month ?? 1;
    const selectedDay = day ?? 1;
    const maxYearAllowed =
      selectedMonth > maxBirth.getMonth() + 1 ||
      (selectedMonth === maxBirth.getMonth() + 1 && selectedDay > maxBirth.getDate())
        ? maxBirth.getFullYear() - 1
        : maxBirth.getFullYear();

    return Array.from({ length: maxYearAllowed - 1925 }, (_, index) => maxYearAllowed - index);
  }, [day, maxBirth, month]);

  function openPicker() {
    setError("");
    setPickerStep(day ? month ? "year" : "month" : "day");
    setPickerOpen(true);
  }

  function selectDay(value: number) {
    setDay(value);
    setError("");
    setPickerStep("month");
  }

  function selectMonth(value: number) {
    setMonth(value);
    setError("");

    if (day && day > daysInMonth(value, year)) {
      setDay(daysInMonth(value, year));
    }

    setPickerStep("year");
  }

  function selectYear(value: number) {
    const safeDay = day && month ? Math.min(day, daysInMonth(month, value)) : day;
    setYear(value);
    setDay(safeDay);
    setError("");
    setBirthDate(composeBirthDate(safeDay, month, value));
    setPickerOpen(false);
  }

  function handleConfirm() {
    if (!birthDate) {
      setError("Selecione sua data de nascimento");
      openPicker();
      return;
    }

    if (!isValidBirthDate(birthDate)) {
      setError("Data de nascimento invalida");
      return;
    }

    if (!isAgeOfMajority(birthDate)) {
      setError("Voce deve ter 18 anos ou mais");
      return;
    }

    sessionStorage.setItem("age_verified_session", "1");
    sessionStorage.setItem("age_verified_date", new Date().toISOString());
    setVisible(false);
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
            <button className={`date-trigger ${birthDate ? "filled" : ""}`} type="button" onClick={openPicker}>
              <span>{displayBirthDate(day, month, year)}</span>
              <ChevronDown size={18} />
            </button>
            {error ? <p className="date-error">{error}</p> : null}
          </div>

          {pickerOpen ? (
            <div className="picker-panel" aria-label="Selecionar data de nascimento">
              <div className="picker-head">
                <div>
                  <span>{pickerStep === "day" ? "1 de 3" : pickerStep === "month" ? "2 de 3" : "3 de 3"}</span>
                  <strong>{pickerStep === "day" ? "Escolha o dia" : pickerStep === "month" ? "Escolha o mes" : "Escolha o ano"}</strong>
                </div>
                <button type="button" onClick={() => setPickerOpen(false)} aria-label="Fechar seletor">
                  Fechar
                </button>
              </div>

              <div className="step-track">
                {(["day", "month", "year"] as PickerStep[]).map((step) => (
                  <span key={step} className={pickerStep === step ? "active" : ""} />
                ))}
              </div>

              <div key={pickerStep} className={`picker-stage ${pickerStep}`}>
                {pickerStep === "day" ? (
                  <div className="day-grid">
                    {dayOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={day === item ? "selected" : ""}
                        onClick={() => selectDay(item)}
                      >
                        {pad(item)}
                      </button>
                    ))}
                  </div>
                ) : null}

                {pickerStep === "month" ? (
                  <div className="month-grid">
                    {months.map((item, index) => (
                      <button
                        key={item}
                        type="button"
                        className={month === index + 1 ? "selected" : ""}
                        onClick={() => selectMonth(index + 1)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}

                {pickerStep === "year" ? (
                  <div className="year-wheel">
                    {yearOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={year === item ? "selected" : ""}
                        onClick={() => selectYear(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

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

        .date-trigger {
          display: flex;
          width: 100%;
          min-height: 54px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: #0f172a;
          color: #7f8ea4;
          padding: 0 14px;
          font-size: 15px;
          font-weight: 750;
          text-align: left;
          cursor: pointer;
        }

        .date-trigger.filled {
          border-color: rgba(212, 168, 67, 0.28);
          color: #f8fafc;
        }

        .date-trigger svg {
          color: ${GOLD};
          flex-shrink: 0;
        }

        .date-error {
          margin: 8px 0 0;
          color: #ef4444;
          font-size: 12px;
        }

        .picker-panel {
          margin: 0 0 16px;
          overflow: hidden;
          border: 1px solid rgba(212, 168, 67, 0.2);
          border-radius: 18px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent),
            #080f1d;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .picker-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 14px 10px;
          text-align: left;
        }

        .picker-head span {
          display: block;
          margin-bottom: 3px;
          color: ${GOLD};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .picker-head strong {
          color: #f8fafc;
          font-size: 15px;
          font-weight: 900;
        }

        .picker-head button {
          min-height: 34px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .step-track {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          padding: 0 14px 12px;
        }

        .step-track span {
          height: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          transition: background 0.2s ease;
        }

        .step-track span.active {
          background: linear-gradient(90deg, #ffe08b, ${GOLD});
        }

        .picker-stage {
          padding: 0 14px 14px;
          animation: stageIn 0.2s ease both;
        }

        .day-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 7px;
        }

        .day-grid button,
        .month-grid button,
        .year-wheel button {
          min-height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.045);
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .day-grid button:active,
        .month-grid button:active,
        .year-wheel button:active {
          transform: scale(0.96);
        }

        .day-grid button.selected,
        .month-grid button.selected,
        .year-wheel button.selected {
          border-color: rgba(212, 168, 67, 0.55);
          background: linear-gradient(135deg, rgba(255, 224, 139, 0.34), rgba(212, 168, 67, 0.18));
          color: #fff4c7;
        }

        .month-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .month-grid button {
          min-height: 48px;
          justify-content: flex-start;
          padding: 0 12px;
          text-align: left;
        }

        .year-wheel {
          display: grid;
          max-height: 238px;
          gap: 8px;
          overflow-y: auto;
          padding-right: 3px;
          scroll-snap-type: y mandatory;
        }

        .year-wheel button {
          min-height: 52px;
          scroll-snap-align: center;
          font-size: 19px;
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

          .day-grid {
            gap: 6px;
          }

          .day-grid button {
            min-height: 40px;
            border-radius: 10px;
            font-size: 13px;
          }

          .month-grid button {
            min-height: 46px;
          }

          .year-wheel {
            max-height: 220px;
          }
        }
      `}</style>
    </div>
  );
}
