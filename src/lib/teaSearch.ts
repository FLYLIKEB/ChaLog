import { Tea } from '../types';

export type TeaFieldKey = keyof Tea;

export interface FilterTeasOptions {
  fields?: TeaFieldKey[];
  normalize?: (value: string) => string;
}

const removeDiacritics = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const defaultNormalize = (value: string) =>
  removeDiacritics(value.toLowerCase().trim());

const DEFAULT_FIELDS: TeaFieldKey[] = ['name'];

export function filterTeasByQuery(
  teaList: Tea[],
  query: string,
  options: FilterTeasOptions = {}
) {
  const normalize = options.normalize ?? defaultNormalize;
  const normalizedQuery = normalize(query ?? '');

  if (!normalizedQuery) {
    return [];
  }

  const fields =
    options.fields && options.fields.length > 0 ? options.fields : DEFAULT_FIELDS;

  return teaList.filter(tea =>
    fields.some(field => {
      const value = tea[field];
      if (value === undefined || value === null) return false;
      return normalize(String(value)).includes(normalizedQuery);
    })
  );
}

