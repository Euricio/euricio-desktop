/** Normalisiert eine Telefonnummer: entfernt Leerzeichen, Bindestriche, Klammern. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '');
}

/** Prüft ob zwei Nummern nach Normalisierung übereinstimmen. */
export function phonesMatch(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}
