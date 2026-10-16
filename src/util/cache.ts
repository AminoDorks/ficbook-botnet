import { write } from 'bun';
import debounce from 'lodash.debounce';

import { PATHS } from '../constants';
import type { CachedUnit } from '../types/cache';

let cacheMap: Map<string, CachedUnit>;

const cacheSave = () => {
  write(PATHS.cache, JSON.stringify(Object.fromEntries(cacheMap), null, 4));
};

export const debouncedSave = debounce(() => {
  cacheSave();
}, 500);

export const cacheSet = (key: string, unit: CachedUnit) => {
  cacheMap.set(key, unit);
  debouncedSave();
};

export const cacheRemove = (key: string) => {
  cacheMap.delete(key);
  debouncedSave();
};

export const cacheGet = (key: string) => {
  return cacheMap.get(key);
};

export const initCache = async () => {
  if (cacheMap) return cacheMap;

  cacheMap = new Map<string, CachedUnit>();

  try {
    const data = await Bun.file(PATHS.cache).json();
    if (data) cacheMap = new Map<string, CachedUnit>(Object.entries(data));
  } catch {}

  console.log(`[cache]: current units length: ${cacheMap.size}`);

  return cacheMap;
};
