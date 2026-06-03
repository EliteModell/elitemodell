"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  CalendarDays,
  Check,
  CirclePlus,
  Crown,
  Diamond,
  FileVideo,
  Gem,
  ImagePlus,
  MessageCircle,
  ShieldCheck,
  Star,
  TrendingUp,
  UserRound,
} from "lucide-react";

type IllustrationKind =
  | "growth"
  | "content"
  | "crown"
  | "diamond"
  | "profile"
  | "camera"
  | "calendar"
  | "shield";
type PremiumIconName = IllustrationKind | "image" | "video" | "story" | "message" | "star" | "calendar";

export function ProfessionalPremiumStyles() {
  return (
    <style>{`
      :root {
        --elite-bg: #050505;
        --elite-bg-soft: #090909;
        --elite-card: #111111;
        --elite-card-2: #181818;
        --elite-gold: #D6A83A;
        --elite-gold-light: #F5D46B;
        --elite-gold-dark: #8A671F;
        --elite-text: #FFFFFF;
        --elite-text-muted: #B8B8B8;
        --elite-border: rgba(214,168,58,0.35);
        --elite-border-soft: rgba(214,168,58,0.18);
        --elite-success: #75D99A;
        --elite-danger: #FF6B6B;
        --elite-warning: #FFB84D;
      }

      .professional-shell {
        background:
          radial-gradient(circle at top right, rgba(214,168,58,0.13), transparent 34%),
          radial-gradient(circle at top left, rgba(214,168,58,0.06), transparent 28%),
          linear-gradient(180deg, #050505 0%, #090806 45%, #050505 100%) !important;
      }

      .professional-page {
        padding-left: 16px !important;
        padding-right: 16px !important;
        padding-bottom: calc(158px + env(safe-area-inset-bottom)) !important;
      }

      .professional-content {
        max-width: 960px !important;
      }

      .professional-premium-page {
        width: 100%;
        max-width: 960px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 18px;
        color: var(--elite-text);
        overflow-x: hidden;
      }

      .premium-card,
      .premium-hero,
      .premium-action-card,
      .premium-section-card,
      .premium-plan-card,
      .premium-upload-zone,
      .premium-profile-row {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--elite-border);
        border-radius: 24px;
        background:
          radial-gradient(circle at 82% 18%, rgba(214,168,58,0.16), transparent 34%),
          linear-gradient(145deg, rgba(22,22,22,0.98), rgba(8,8,8,0.98));
        box-shadow:
          0 14px 40px rgba(0,0,0,0.45),
          inset 0 1px 0 rgba(255,255,255,0.04);
      }

      .premium-card::before,
      .premium-hero::before,
      .premium-action-card::before,
      .premium-section-card::before,
      .premium-plan-card::before,
      .premium-upload-zone::before,
      .premium-profile-row::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(245,212,107,0.72), transparent);
        pointer-events: none;
      }

      .premium-hero {
        min-height: 292px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(230px, 0.62fr);
        gap: 18px;
        align-items: center;
        padding: 30px 28px;
        isolation: isolate;
      }

      .premium-hero::after {
        content: "";
        position: absolute;
        right: -8%;
        top: 8%;
        width: 48%;
        height: 84%;
        background:
          radial-gradient(ellipse at center, rgba(245,212,107,0.20), rgba(214,168,58,0.08) 42%, transparent 70%);
        filter: blur(3px);
        pointer-events: none;
      }

      .premium-hero-copy {
        position: relative;
        z-index: 2;
        max-width: 610px;
      }

      .premium-eyebrow {
        margin: 0;
        color: var(--elite-gold-light);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.28em;
        text-transform: uppercase;
      }

      .premium-title {
        margin: 12px 0 0;
        color: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(40px, 7vw, 68px);
        font-weight: 600;
        letter-spacing: 0;
        line-height: 0.96;
        text-wrap: balance;
      }

      .premium-title .gold,
      .premium-gold {
        color: var(--elite-gold-light);
      }

      .premium-description {
        margin: 18px 0 0;
        max-width: 580px;
        color: var(--elite-text-muted);
        font-size: 17px;
        line-height: 1.65;
      }

      .premium-illustration {
        position: relative;
        z-index: 1;
        min-height: 232px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      .premium-art-scene {
        position: relative;
        display: block;
        width: min(100%, 318px);
        height: 226px;
        color: var(--elite-gold-light);
        filter: drop-shadow(0 18px 34px rgba(0,0,0,0.45));
      }

      .premium-art-scene::before {
        content: "";
        position: absolute;
        inset: 18px 10px 28px;
        border-radius: 999px;
        background:
          radial-gradient(circle at 50% 45%, rgba(245,212,107,0.28), rgba(214,168,58,0.10) 42%, transparent 72%);
        filter: blur(18px);
      }

      .premium-art-beam {
        position: absolute;
        left: 44%;
        top: 0;
        width: 120px;
        height: 174px;
        transform: skewX(-12deg);
        background: linear-gradient(180deg, rgba(245,212,107,0.34), rgba(245,212,107,0.04) 62%, transparent);
        opacity: 0.7;
        filter: blur(2px);
      }

      .premium-art-floor {
        position: absolute;
        left: 18%;
        right: 8%;
        bottom: 10px;
        height: 24px;
        border-radius: 50%;
        background:
          radial-gradient(ellipse at center, rgba(245,212,107,0.34), rgba(214,168,58,0.10) 42%, transparent 72%);
        filter: blur(1px);
      }

      .premium-art-pedestal {
        position: absolute;
        left: 42%;
        bottom: 24px;
        width: 112px;
        height: 44px;
        border: 1px solid rgba(245,212,107,0.38);
        border-radius: 50% 50% 22px 22px;
        background:
          linear-gradient(180deg, rgba(245,212,107,0.24), rgba(214,168,58,0.10) 45%, rgba(0,0,0,0.58)),
          linear-gradient(90deg, rgba(0,0,0,0.58), rgba(245,212,107,0.32), rgba(0,0,0,0.48));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 18px 28px rgba(0,0,0,0.45);
      }

      .premium-art-pedestal::before {
        content: "";
        position: absolute;
        left: 9px;
        right: 9px;
        top: -8px;
        height: 18px;
        border-radius: 50%;
        border: 1px solid rgba(245,212,107,0.42);
        background: linear-gradient(90deg, rgba(34,24,8,0.96), rgba(245,212,107,0.30), rgba(34,24,8,0.92));
      }

      .premium-art-bars {
        position: absolute;
        right: 18px;
        bottom: 58px;
        width: 132px;
        height: 118px;
      }

      .premium-art-bars i {
        position: absolute;
        bottom: 0;
        width: 18px;
        border: 1px solid rgba(245,212,107,0.46);
        border-radius: 8px 8px 2px 2px;
        background:
          linear-gradient(90deg, rgba(71,48,9,0.92), rgba(245,212,107,0.82), rgba(138,103,31,0.86));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.22), 0 0 20px rgba(214,168,58,0.20);
      }

      .premium-art-bars i:nth-child(1) { left: 12px; height: 38px; opacity: 0.72; }
      .premium-art-bars i:nth-child(2) { left: 42px; height: 58px; opacity: 0.84; }
      .premium-art-bars i:nth-child(3) { left: 72px; height: 84px; }
      .premium-art-bars i:nth-child(4) { left: 102px; height: 112px; }

      .premium-art-arrow {
        position: absolute;
        right: 22px;
        top: 40px;
        width: 136px;
        height: 86px;
      }

      .premium-art-arrow::before {
        content: "";
        position: absolute;
        left: 0;
        top: 54px;
        width: 112px;
        height: 5px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(138,103,31,0.75), rgba(245,212,107,0.96));
        transform: rotate(-34deg);
        transform-origin: right center;
        box-shadow: 0 0 18px rgba(214,168,58,0.28);
      }

      .premium-art-arrow::after {
        content: "";
        position: absolute;
        right: 0;
        top: 4px;
        width: 0;
        height: 0;
        border-left: 22px solid var(--elite-gold-light);
        border-top: 15px solid transparent;
        border-bottom: 15px solid transparent;
        filter: drop-shadow(0 0 14px rgba(214,168,58,0.38));
        transform: rotate(-34deg);
      }

      .premium-art-crown-shape {
        position: absolute;
        left: 62px;
        bottom: 78px;
        width: 112px;
        height: 78px;
        clip-path: polygon(0 44%, 17% 60%, 29% 15%, 50% 54%, 71% 15%, 83% 60%, 100% 44%, 91% 100%, 9% 100%);
        background:
          linear-gradient(135deg, #6F4B12 0%, #F8DD83 34%, #C7962C 58%, #7A5418 100%);
        border: 1px solid rgba(245,212,107,0.48);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.36), 0 0 24px rgba(214,168,58,0.24);
        transform: perspective(420px) rotateX(8deg) rotateZ(-2deg);
      }

      .premium-art-crown-shape::after {
        content: "";
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 8px;
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(42,27,7,0.70), rgba(255,236,148,0.72), rgba(42,27,7,0.62));
      }

      .premium-art-diamond-shape {
        position: absolute;
        left: 86px;
        bottom: 74px;
        width: 112px;
        height: 112px;
        clip-path: polygon(50% 0, 100% 35%, 50% 100%, 0 35%);
        background:
          linear-gradient(135deg, rgba(255,247,198,0.95), rgba(245,212,107,0.82) 38%, rgba(138,103,31,0.92) 72%, rgba(255,239,165,0.85));
        box-shadow: inset 0 0 18px rgba(255,255,255,0.18), 0 0 34px rgba(214,168,58,0.34);
      }

      .premium-art-diamond-shape::before,
      .premium-art-diamond-shape::after {
        content: "";
        position: absolute;
        inset: 24px;
        border: 1px solid rgba(255,255,255,0.38);
        transform: rotate(45deg);
      }

      .premium-art-diamond-scene .premium-art-bars {
        right: 16px;
        bottom: 42px;
        opacity: 0.54;
        transform: scale(0.76);
        transform-origin: right bottom;
      }

      .premium-art-camera-body {
        position: absolute;
        left: 32px;
        bottom: 54px;
        width: 132px;
        height: 78px;
        border: 1px solid rgba(245,212,107,0.42);
        border-radius: 18px;
        background:
          linear-gradient(135deg, rgba(77,52,12,0.96), rgba(16,14,12,0.98) 48%, rgba(168,125,34,0.82));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 16px 30px rgba(0,0,0,0.38);
      }

      .premium-art-camera-body::before {
        content: "";
        position: absolute;
        left: 16px;
        top: -18px;
        width: 50px;
        height: 24px;
        border: 1px solid rgba(245,212,107,0.34);
        border-radius: 14px 14px 4px 4px;
        background: linear-gradient(135deg, rgba(245,212,107,0.32), rgba(0,0,0,0.40));
      }

      .premium-art-camera-lens {
        position: absolute;
        left: 48px;
        top: 20px;
        width: 44px;
        height: 44px;
        border-radius: 999px;
        border: 6px solid rgba(245,212,107,0.74);
        background:
          radial-gradient(circle at 34% 32%, rgba(255,255,255,0.58), transparent 16%),
          radial-gradient(circle, rgba(0,0,0,0.94), rgba(62,42,11,0.96));
        box-shadow: 0 0 22px rgba(214,168,58,0.26);
      }

      .premium-art-phone-card,
      .premium-art-photo-card,
      .premium-art-video-card {
        position: absolute;
        border: 1px solid rgba(245,212,107,0.32);
        border-radius: 16px;
        background: linear-gradient(145deg, rgba(27,25,22,0.98), rgba(7,7,8,0.94));
        box-shadow: 0 14px 26px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.06);
      }

      .premium-art-phone-card {
        right: 50px;
        top: 22px;
        width: 72px;
        height: 126px;
      }

      .premium-art-phone-card::before {
        content: "";
        position: absolute;
        left: 16px;
        right: 16px;
        top: 13px;
        height: 6px;
        border-radius: 999px;
        background: rgba(245,212,107,0.28);
      }

      .premium-art-phone-card::after {
        content: "";
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 20px;
        height: 34px;
        border-radius: 999px;
        background:
          radial-gradient(circle at center, rgba(245,212,107,0.62), rgba(214,168,58,0.18) 56%, transparent 58%);
      }

      .premium-art-photo-card {
        right: 18px;
        bottom: 56px;
        width: 74px;
        height: 66px;
        transform: rotate(8deg);
      }

      .premium-art-photo-card::before {
        content: "";
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 12px;
        height: 24px;
        clip-path: polygon(0 100%, 34% 28%, 54% 72%, 74% 38%, 100% 100%);
        background: linear-gradient(135deg, rgba(245,212,107,0.80), rgba(138,103,31,0.62));
      }

      .premium-art-video-card {
        right: 96px;
        bottom: 28px;
        width: 72px;
        height: 56px;
        transform: rotate(-7deg);
      }

      .premium-art-video-card::before {
        content: "";
        position: absolute;
        left: 28px;
        top: 15px;
        width: 0;
        height: 0;
        border-left: 18px solid var(--elite-gold-light);
        border-top: 12px solid transparent;
        border-bottom: 12px solid transparent;
        filter: drop-shadow(0 0 10px rgba(214,168,58,0.35));
      }

      .premium-art-profile-card {
        position: absolute;
        left: 56px;
        bottom: 46px;
        width: 148px;
        height: 146px;
        border: 1px solid rgba(245,212,107,0.34);
        border-radius: 28px;
        background:
          radial-gradient(circle at 50% 34%, rgba(245,212,107,0.18), transparent 40%),
          linear-gradient(145deg, rgba(22,22,22,0.98), rgba(8,8,8,0.94));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 32px rgba(0,0,0,0.42);
      }

      .premium-art-profile-card::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 28px;
        width: 48px;
        height: 48px;
        border: 5px solid rgba(245,212,107,0.78);
        border-radius: 999px;
        transform: translateX(-50%);
      }

      .premium-art-profile-card::after {
        content: "";
        position: absolute;
        left: 35px;
        right: 35px;
        bottom: 28px;
        height: 42px;
        border: 5px solid rgba(245,212,107,0.78);
        border-bottom: 0;
        border-radius: 52px 52px 0 0;
      }

      .premium-art-shield {
        position: absolute;
        right: 40px;
        bottom: 52px;
        width: 78px;
        height: 90px;
        clip-path: polygon(50% 0, 95% 18%, 85% 72%, 50% 100%, 15% 72%, 5% 18%);
        background:
          linear-gradient(145deg, rgba(117,217,154,0.80), rgba(20,72,38,0.92)),
          linear-gradient(145deg, rgba(245,212,107,0.35), rgba(0,0,0,0));
        box-shadow: 0 0 26px rgba(117,217,154,0.22);
      }

      .premium-art-shield::after {
        content: "";
        position: absolute;
        left: 26px;
        top: 32px;
        width: 28px;
        height: 15px;
        border-left: 5px solid #061208;
        border-bottom: 5px solid #061208;
        transform: rotate(-45deg);
      }

      .premium-art-calendar-card {
        position: absolute;
        left: 58px;
        bottom: 44px;
        width: 152px;
        height: 134px;
        border: 1px solid rgba(245,212,107,0.36);
        border-radius: 22px;
        background:
          linear-gradient(180deg, rgba(214,168,58,0.20), rgba(214,168,58,0.05) 28%, rgba(8,8,8,0.96) 29%),
          linear-gradient(145deg, rgba(24,22,18,0.98), rgba(7,7,8,0.98));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 34px rgba(0,0,0,0.42);
      }

      .premium-art-calendar-card::before {
        content: "";
        position: absolute;
        left: 22px;
        right: 22px;
        top: 48px;
        bottom: 22px;
        background:
          radial-gradient(circle at 14px 14px, rgba(245,212,107,0.78) 0 4px, transparent 5px),
          radial-gradient(circle at 52px 14px, rgba(245,212,107,0.48) 0 4px, transparent 5px),
          radial-gradient(circle at 90px 14px, rgba(245,212,107,0.48) 0 4px, transparent 5px),
          radial-gradient(circle at 14px 48px, rgba(245,212,107,0.48) 0 4px, transparent 5px),
          radial-gradient(circle at 52px 48px, rgba(245,212,107,0.78) 0 4px, transparent 5px),
          radial-gradient(circle at 90px 48px, rgba(245,212,107,0.48) 0 4px, transparent 5px);
      }

      .premium-art-camera-scene .premium-art-phone-card,
      .premium-art-calendar-scene .premium-art-shield,
      .premium-art-shield-scene .premium-art-profile-card {
        opacity: 0.72;
        transform: scale(0.82);
      }

      .premium-art-spark {
        position: absolute;
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--elite-gold-light);
        box-shadow: 0 0 14px rgba(245,212,107,0.82);
      }

      .premium-art-spark.s1 { left: 44px; top: 54px; opacity: 0.78; }
      .premium-art-spark.s2 { right: 52px; top: 24px; width: 5px; height: 5px; opacity: 0.72; }
      .premium-art-spark.s3 { right: 24px; bottom: 96px; width: 4px; height: 4px; opacity: 0.60; }

      .premium-action-card {
        min-height: 124px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 20px;
        align-items: center;
        padding: 22px;
        text-decoration: none;
        color: inherit;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
      }

      .premium-action-card:hover {
        transform: translateY(-1px);
        border-color: rgba(245,212,107,0.65);
        box-shadow: 0 16px 42px rgba(0,0,0,0.55), 0 0 24px rgba(214,168,58,0.12);
      }

      .premium-action-card:active {
        transform: scale(0.985);
      }

      .premium-icon-orb {
        position: relative;
        width: 82px;
        height: 82px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(245,212,107,0.42);
        border-radius: 999px;
        background:
          radial-gradient(circle at 42% 34%, rgba(245,212,107,0.28), rgba(214,168,58,0.10) 44%, rgba(0,0,0,0.18) 68%),
          linear-gradient(145deg, rgba(214,168,58,0.14), rgba(0,0,0,0.35));
        color: var(--elite-gold-light);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 28px rgba(214,168,58,0.12);
      }

      .premium-icon-orb::after {
        content: "";
        position: absolute;
        inset: 12px;
        border-radius: inherit;
        border: 1px solid rgba(245,212,107,0.16);
      }

      .premium-icon-orb svg {
        position: relative;
        z-index: 1;
        width: 36px;
        height: 36px;
        filter: drop-shadow(0 0 16px rgba(214,168,58,0.38));
      }

      .premium-action-body {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .premium-action-title {
        margin: 0;
        color: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 30px;
        font-weight: 600;
        line-height: 1.08;
      }

      .premium-action-text {
        margin: 0;
        color: var(--elite-text-muted);
        font-size: 16px;
        line-height: 1.45;
      }

      .premium-button,
      .premium-button-secondary {
        min-height: 52px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        border-radius: 16px;
        padding: 0 20px;
        font-size: 15px;
        font-weight: 900;
        text-decoration: none;
        cursor: pointer;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
        white-space: nowrap;
      }

      .premium-button {
        border: 1px solid rgba(255,255,255,0.18);
        background: linear-gradient(135deg, #F5D46B 0%, #D6A83A 48%, #B88722 100%);
        color: #080808;
        box-shadow:
          0 10px 26px rgba(214,168,58,0.28),
          inset 0 1px 0 rgba(255,255,255,0.45);
      }

      .premium-button-secondary {
        border: 1px solid rgba(214,168,58,0.35);
        background: rgba(214,168,58,0.08);
        color: var(--elite-gold-light);
      }

      .premium-button:hover,
      .premium-button-secondary:hover {
        transform: translateY(-1px);
      }

      .premium-button:active,
      .premium-button-secondary:active {
        transform: scale(0.985);
      }

      .premium-badge {
        width: fit-content;
        max-width: 100%;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(214,168,58,0.38);
        border-radius: 999px;
        background: rgba(214,168,58,0.10);
        color: var(--elite-gold-light);
        padding: 7px 12px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .premium-section-card {
        padding: 22px;
      }

      .premium-section-title {
        margin: 0;
        color: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(30px, 7vw, 44px);
        font-weight: 600;
        line-height: 1.04;
      }

      .premium-grid {
        display: grid;
        gap: 16px;
      }

      .premium-grid-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .premium-grid-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .premium-check-card {
        min-height: 62px;
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid var(--elite-border-soft);
        border-radius: 16px;
        background: rgba(255,255,255,0.035);
        padding: 14px 16px;
        color: #d8d8d8;
        font-size: 15px;
        font-weight: 800;
      }

      .premium-check-card svg {
        width: 22px;
        height: 22px;
        color: var(--elite-gold-light);
        flex: 0 0 auto;
      }

      .premium-plan-card {
        min-height: 378px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 22px;
      }

      .premium-plan-card.featured {
        border-color: rgba(245,212,107,0.75);
        box-shadow: 0 22px 70px rgba(0,0,0,0.50), 0 0 38px rgba(214,168,58,0.18);
      }

      .premium-plan-title {
        margin: 0;
        color: #fff;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 27px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-align: center;
      }

      .premium-plan-benefits {
        list-style: none;
        margin: 4px 0 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }

      .premium-plan-benefits li {
        display: flex;
        gap: 10px;
        align-items: center;
        color: var(--elite-text-muted);
        font-size: 14px;
      }

      .premium-plan-benefits svg {
        color: var(--elite-gold-light);
        flex: 0 0 auto;
      }

      .premium-upload-zone {
        border-style: dashed;
        padding: 28px 22px;
        text-align: center;
        cursor: pointer;
      }

      .premium-upload-zone .premium-icon-orb {
        margin: 0 auto 16px;
      }

      .premium-profile-row {
        display: grid;
        grid-template-columns: auto minmax(0,1fr) auto;
        gap: 18px;
        align-items: center;
        padding: 18px;
        text-decoration: none;
        color: inherit;
      }

      .premium-avatar {
        position: relative;
        width: 88px;
        height: 88px;
        border-radius: 999px;
        border: 2px solid var(--elite-gold-light);
        background: rgba(214,168,58,0.12);
        display: grid;
        place-items: center;
        overflow: hidden;
        box-shadow: 0 0 26px rgba(214,168,58,0.16);
      }

      .premium-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .premium-avatar-camera {
        position: absolute;
        right: -2px;
        bottom: -2px;
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        border: 1px solid var(--elite-gold-light);
        background: #080808;
        color: var(--elite-gold-light);
      }

      .premium-form input,
      .premium-form textarea,
      .premium-form select {
        width: 100%;
        min-height: 56px;
        border: 1px solid rgba(214,168,58,0.28);
        border-radius: 16px;
        background: rgba(8,8,8,0.92);
        color: #fff;
        padding: 14px 16px;
        outline: none;
      }

      .premium-form textarea {
        min-height: 138px;
        resize: vertical;
      }

      .premium-form label {
        display: block;
        margin-bottom: 8px;
        color: var(--elite-gold-light);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .professional-bottom-nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        padding: 8px 8px calc(10px + env(safe-area-inset-bottom));
        background: rgba(5,5,5,0.92);
        backdrop-filter: blur(18px);
        border-top: 1px solid rgba(214,168,58,0.25);
        box-shadow: 0 -12px 40px rgba(0,0,0,0.55);
      }

      .professional-bottom-nav-inner {
        max-width: 430px;
        min-height: 76px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(5, minmax(0,1fr));
        gap: 4px;
      }

      .professional-bottom-nav a {
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border-radius: 18px;
        color: rgba(255,255,255,0.48);
        font-size: 12px;
        font-weight: 900;
        text-decoration: none;
      }

      .professional-bottom-nav a.active {
        border: 1px solid rgba(245,212,107,0.40);
        background: linear-gradient(145deg, rgba(214,168,58,0.26), rgba(12,10,6,0.94));
        color: var(--elite-gold-light);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 26px rgba(214,168,58,0.12);
      }

      .professional-bottom-nav svg {
        width: 24px;
        height: 24px;
      }

      @media (min-width: 768px) {
        .professional-page {
          padding-bottom: 42px !important;
        }
      }

      @media (max-width: 760px) {
        .premium-hero {
          grid-template-columns: 1fr;
          min-height: auto;
          padding: 28px 22px 18px;
          gap: 4px;
        }

        .premium-hero::after {
          right: -24%;
          top: 22%;
          width: 90%;
          height: 54%;
          opacity: 0.72;
        }

        .premium-illustration {
          min-height: 156px;
          justify-content: flex-end;
          margin-top: -10px;
        }

        .premium-art-scene {
          width: min(76vw, 286px);
          height: 168px;
          transform: scale(0.82);
          transform-origin: right center;
        }

        .premium-action-card {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .premium-action-card .premium-button,
        .premium-action-card .premium-button-secondary {
          grid-column: 1 / -1;
          width: 100%;
          margin-top: 4px;
        }

        .premium-grid-2,
        .premium-grid-3 {
          grid-template-columns: 1fr;
        }

        .premium-profile-row {
          grid-template-columns: auto minmax(0,1fr) 24px;
          padding: 16px;
        }
      }

      @media (max-width: 430px) {
        .premium-hero {
          padding: 24px 18px 16px;
        }

        .premium-title {
          font-size: clamp(36px, 11vw, 52px);
        }

        .premium-description {
          font-size: 16px;
        }

        .premium-illustration {
          min-height: 132px;
          margin-top: -8px;
        }

        .premium-art-scene {
          width: min(82vw, 254px);
          transform: scale(0.72);
        }

        .premium-action-card {
          padding: 18px;
          gap: 14px;
          min-height: 112px;
        }

        .premium-icon-orb {
          width: 66px;
          height: 66px;
        }

        .premium-icon-orb svg {
          width: 30px;
          height: 30px;
        }

        .premium-action-title {
          font-size: 25px;
        }

        .premium-button,
        .premium-button-secondary {
          min-height: 50px;
          padding: 0 16px;
        }
      }

      @media (max-width: 370px) {
        .professional-page {
          padding-left: 14px !important;
          padding-right: 14px !important;
        }

        .premium-title {
          font-size: 34px;
        }

        .premium-profile-row {
          grid-template-columns: 1fr;
          text-align: center;
        }

        .premium-avatar {
          margin: 0 auto;
        }
      }
    `}</style>
  );
}

function renderPremiumIcon(kind: PremiumIconName, className?: string, size?: number) {
  const props = { className, size };
  switch (kind) {
    case "content":
      return <Camera {...props} />;
    case "video":
      return <FileVideo {...props} />;
    case "calendar":
      return <CalendarDays {...props} />;
    case "crown":
      return <Crown {...props} />;
    case "diamond":
      return <Gem {...props} />;
    case "profile":
      return <UserRound {...props} />;
    case "camera":
    case "image":
      return <ImagePlus {...props} />;
    case "shield":
      return <ShieldCheck {...props} />;
    case "story":
      return <CirclePlus {...props} />;
    case "message":
      return <MessageCircle {...props} />;
    case "star":
      return <Star {...props} />;
    default:
      return <TrendingUp {...props} />;
  }
}

function ArtSparkles() {
  return (
    <>
      <span className="premium-art-spark s1" />
      <span className="premium-art-spark s2" />
      <span className="premium-art-spark s3" />
    </>
  );
}

function GrowthScene({ crown = false }: { crown?: boolean }) {
  return (
    <span className={crown ? "premium-art-scene premium-art-crown-scene" : "premium-art-scene premium-art-growth-scene"}>
      <span className="premium-art-beam" />
      <span className="premium-art-floor" />
      <span className="premium-art-pedestal" />
      {crown ? <span className="premium-art-crown-shape" /> : null}
      <span className="premium-art-bars">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="premium-art-arrow" />
      <ArtSparkles />
    </span>
  );
}

function ContentScene() {
  return (
    <span className="premium-art-scene premium-art-content-scene">
      <span className="premium-art-beam" />
      <span className="premium-art-floor" />
      <span className="premium-art-phone-card" />
      <span className="premium-art-photo-card" />
      <span className="premium-art-video-card" />
      <span className="premium-art-camera-body">
        <span className="premium-art-camera-lens" />
      </span>
      <ArtSparkles />
    </span>
  );
}

function DiamondScene() {
  return (
    <span className="premium-art-scene premium-art-diamond-scene">
      <span className="premium-art-beam" />
      <span className="premium-art-floor" />
      <span className="premium-art-bars">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="premium-art-diamond-shape" />
      <ArtSparkles />
    </span>
  );
}

function ProfileScene() {
  return (
    <span className="premium-art-scene premium-art-profile-scene">
      <span className="premium-art-beam" />
      <span className="premium-art-floor" />
      <span className="premium-art-profile-card" />
      <span className="premium-art-shield" />
      <ArtSparkles />
    </span>
  );
}

function CameraScene() {
  return (
    <span className="premium-art-scene premium-art-camera-scene">
      <span className="premium-art-beam" />
      <span className="premium-art-floor" />
      <span className="premium-art-phone-card" />
      <span className="premium-art-photo-card" />
      <span className="premium-art-camera-body">
        <span className="premium-art-camera-lens" />
      </span>
      <ArtSparkles />
    </span>
  );
}

function CalendarScene() {
  return (
    <span className="premium-art-scene premium-art-calendar-scene">
      <span className="premium-art-beam" />
      <span className="premium-art-floor" />
      <span className="premium-art-calendar-card" />
      <span className="premium-art-shield" />
      <ArtSparkles />
    </span>
  );
}

function ShieldScene() {
  return (
    <span className="premium-art-scene premium-art-shield-scene">
      <span className="premium-art-beam" />
      <span className="premium-art-floor" />
      <span className="premium-art-profile-card" />
      <span className="premium-art-shield" />
      <ArtSparkles />
    </span>
  );
}

function renderIllustrationScene(kind: IllustrationKind) {
  switch (kind) {
    case "content":
      return <ContentScene />;
    case "crown":
      return <GrowthScene crown />;
    case "diamond":
      return <DiamondScene />;
    case "profile":
      return <ProfileScene />;
    case "camera":
      return <CameraScene />;
    case "calendar":
      return <CalendarScene />;
    case "shield":
      return <ShieldScene />;
    default:
      return <GrowthScene />;
  }
}

export function PremiumIllustration({ kind = "growth" }: { kind?: IllustrationKind }) {
  return (
    <div className="premium-illustration" aria-hidden="true">
      {renderIllustrationScene(kind)}
    </div>
  );
}

export function PremiumHeroCard({
  eyebrow,
  title,
  subtitle,
  illustration = "growth",
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  illustration?: IllustrationKind;
}) {
  return (
    <section className="premium-hero">
      <div className="premium-hero-copy">
        <p className="premium-eyebrow">{eyebrow}</p>
        <h1 className="premium-title">{title}</h1>
        <p className="premium-description">{subtitle}</p>
      </div>
      <PremiumIllustration kind={illustration} />
    </section>
  );
}

export function PremiumActionCard({
  href,
  icon,
  title,
  description,
  buttonLabel,
  badge,
}: {
  href: string;
  icon: PremiumIconName;
  title: string;
  description: string;
  buttonLabel: string;
  badge?: string;
}) {
  return (
    <Link href={href} className="premium-action-card">
      <span className="premium-icon-orb">
        {renderPremiumIcon(icon)}
      </span>
      <span className="premium-action-body">
        {badge ? <span className="premium-badge">{badge}</span> : null}
        <span className="premium-action-title">{title}</span>
        <span className="premium-action-text">{description}</span>
      </span>
      <span className="premium-button">
        {buttonLabel}
        <ArrowRight size={18} />
      </span>
    </Link>
  );
}

export function PremiumButtonLink({
  href,
  children,
  secondary,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link href={href} className={secondary ? "premium-button-secondary" : "premium-button"}>
      {children}
    </Link>
  );
}

export function PremiumChecklistItem({ label }: { label: string }) {
  return (
    <div className="premium-check-card">
      <Check />
      <span>{label}</span>
    </div>
  );
}

export function PremiumPlanCard({
  title,
  description,
  benefits,
  featured,
}: {
  title: string;
  description: string;
  benefits: string[];
  featured?: boolean;
}) {
  return (
    <article className={`premium-plan-card ${featured ? "featured" : ""}`}>
      {featured ? <span className="premium-badge" style={{ margin: "-36px auto 0" }}>Mais popular</span> : null}
      <span className="premium-icon-orb" style={{ margin: "0 auto" }}>
        {title === "DIAMANTE" ? <Diamond /> : <Crown />}
      </span>
      <h3 className="premium-plan-title">{title}</h3>
      <p className="premium-action-text" style={{ textAlign: "center", minHeight: 44 }}>{description}</p>
      <ul className="premium-plan-benefits">
        {benefits.map((benefit) => (
          <li key={benefit}>
            <BadgeCheck size={17} />
            {benefit}
          </li>
        ))}
      </ul>
      <span style={{ flex: 1 }} />
      <button type="button" className={featured ? "premium-button" : "premium-button-secondary"} style={{ width: "100%" }}>
        Escolher plano
      </button>
    </article>
  );
}

export function PremiumProfileRow({
  image,
  name,
  location,
  href = "/profissional/perfil",
}: {
  image?: string | null;
  name: string;
  location: string;
  href?: string;
}) {
  return (
    <Link href={href} className="premium-profile-row">
      <span className="premium-avatar">
        {image ? <img src={image} alt={name} /> : <UserRound size={42} color="#F5D46B" />}
        <span className="premium-avatar-camera">
          <Camera size={16} />
        </span>
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", color: "#fff", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>
          Olá, {name}
        </span>
        <span style={{ display: "block", marginTop: 6, color: "var(--elite-text-muted)", fontSize: 16 }}>
          {location}
        </span>
      </span>
      <ArrowRight size={24} color="rgba(255,255,255,0.58)" />
    </Link>
  );
}

export function PremiumSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="premium-section-card">
      {eyebrow ? <p className="premium-eyebrow">{eyebrow}</p> : null}
      <h2 className="premium-section-title">{title}</h2>
      {description ? <p className="premium-description" style={{ marginTop: 10 }}>{description}</p> : null}
      {children ? <div style={{ marginTop: 20 }}>{children}</div> : null}
    </section>
  );
}

export function PremiumMetricCard({
  icon,
  value,
  label,
  description,
}: {
  icon: PremiumIconName;
  value: string;
  label: string;
  description: string;
}) {
  return (
    <article className="premium-section-card" style={{ minHeight: 148 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <span className="premium-icon-orb">
          {renderPremiumIcon(icon)}
        </span>
        <div>
          <strong style={{ display: "block", color: "var(--elite-gold-light)", fontSize: 38, lineHeight: 1 }}>{value}</strong>
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>{label}</span>
        </div>
      </div>
      <p className="premium-action-text" style={{ marginTop: 16 }}>{description}</p>
    </article>
  );
}

export function PremiumUploadCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="premium-upload-zone">
      <span className="premium-icon-orb">
        <ImagePlus />
      </span>
      <h3 className="premium-action-title" style={{ fontSize: 24 }}>{title}</h3>
      <p className="premium-action-text" style={{ maxWidth: 320, margin: "8px auto 0" }}>{description}</p>
      <span className="premium-button" style={{ marginTop: 16 }}>Selecionar arquivo</span>
    </div>
  );
}
