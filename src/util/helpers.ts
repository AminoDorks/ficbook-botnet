import { file } from 'bun';

import { PATHS, START_TOR_PORT } from '../constants';
import type { CachedUnit } from '../types/cache';

export const delay = async (seconds: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

export const findProxies = async (): Promise<string[]> => {
  const matches = (await file(PATHS.torrc).text())
    .match(/SOCKSPort\s+(\d+)/g)
    ?.filter((port) => Number(port.split(' ')[1]) >= START_TOR_PORT);

  return matches
    ? matches.map((match) => `socks5://127.0.0.1:${match.split(' ')[1]}`)
    : [];
};

export const loadAccounts = async (): Promise<CachedUnit[]> =>
  Object.entries(await file(PATHS.cache).json()).map(([_, data]) => ({
    ...(data as CachedUnit),
  }));
