import type { IdentityPart } from "./policy";

export const demoStorageKey = "elite-documental-demo-v1";

export function demoEvidence(part: IdentityPart, variant = 0, date = "") {
  if (!/^\d{2}[/]\d{2}[/]\d{4}$/.test(date)) date = "";
  const title = { back: "VERSO DO DOCUMENTO", front: "FRENTE DO DOCUMENTO", portrait: "FOTO COM DOCUMENTO" }[part];
  const color = variant % 2 ? "#68455e" : "#3f526e";
  const illustration = part === "portrait"
    ? '<circle cx="440" cy="259" r="55" fill="#d2a7af"/><path d="M326 455v-45q114-132 228 0v45z" fill="#b4839c"/><rect x="400" y="374" width="259" height="104" rx="8" fill="#f5e6ed"/><text x="416" y="417" fill="#332739" font-size="19">Verificação ELITE MODELL</text><text x="416" y="448" fill="#332739" font-size="18">' + date + '</text>'
    : '<rect x="185" y="177" width="510" height="285" rx="24" fill="#e8dbed"/><rect x="221" y="248" width="118" height="132" rx="10" fill="#a28aa9"/><circle cx="280" cy="292" r="27" fill="#e8dbed"/><path d="M240 359q40-67 80 0z" fill="#e8dbed"/><text x="366" y="282" fill="#392e45" font-size="27">AMOSTRA FICTÍCIA</text><path d="M367 324h250m-250 35h201m-201 35h158" stroke="#9c86a5" stroke-width="8"/>';
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="880" height="600" viewBox="0 0 880 600" font-family="sans-serif"><rect width="880" height="600" fill="' + color + '"/><text x="440" y="84" text-anchor="middle" fill="white" font-size="28">' + title + '</text>' + illustration + '<text x="440" y="553" text-anchor="middle" fill="white" font-size="23">DEMONSTRAÇÃO · SEM VALIDADE</text></svg>'
  );
}
