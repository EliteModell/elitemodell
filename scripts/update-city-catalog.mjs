import { writeFile } from "node:fs/promises";

const source = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome";
const response = await fetch(source);
if (!response.ok) throw new Error(`IBGE returned ${response.status}`);
const municipalities = await response.json();
const cities = municipalities.map((item) => ({
  id: String(item.id),
  city: item.nome,
  state: item.microrregiao?.mesorregiao?.UF?.sigla ?? item["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla,
}));
if (cities.length < 5500 || new Set(cities.map((item) => item.state)).size !== 27 || cities.some((item) => !item.city || !item.state)) {
  throw new Error("Incomplete IBGE catalog; existing file preserved");
}
await writeFile(new URL("../src/data/brazilian-cities.json", import.meta.url), JSON.stringify(cities));
console.log(`Updated ${cities.length} municipalities from IBGE`);
