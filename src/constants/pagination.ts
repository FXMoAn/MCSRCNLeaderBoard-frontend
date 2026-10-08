export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

export const normalizePageSize = (value: unknown): number => {
  const size = Number(value);
  return PAGE_SIZE_OPTIONS.some((option) => option === size) ? size : DEFAULT_PAGE_SIZE;
};

export const normalizePage = (value: unknown): number => {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
};
