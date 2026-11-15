export const normalize = (text: string) =>
  text
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '');
