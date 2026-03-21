export const OBLAST_OPTIONS = [
  "Ekonomika",
  "Sociálna politika",
  "Zdravotníctvo",
  "Školstvo",
  "Obrana, bezpečnosť, polícia",
  "Zahraničná politika",
  "Európska únia",
  "Doprava",
  "Spravodlivosť a súdnictvo",
  "Korupcia a klientelizmus",
  "Legislatívny proces a hlasovania",
  "Život politických strán",
  "Regionálna problematika",
  "Poľnohospodárstvo",
  "Kultúra a médiá",
  "Národnostné a etnické otázky",
  "LGBTI+",
  "Vojna na Ukrajine",
  "Hodnoty",
  "Iné",
] as const;

export type OblastOption = (typeof OBLAST_OPTIONS)[number];
