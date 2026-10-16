import { Ficbook } from 'ficbook';

import { delay } from './helpers';
import { pool } from './tasks';
import { CONCURRENCIES, TIMEOUT } from '../constants';

export const poolProxies = async (rawProxies: string[]): Promise<string[]> => {
  const proxies: string[] = [];

  console.log(`got ${rawProxies.length} proxies`);

  await pool<string>(
    rawProxies,
    async (proxy: string) => {
      const ficbook = new Ficbook();
      ficbook.proxy = proxy;

      try {
        if (
          await Promise.race([
            ficbook.healthcheck(),
            new Promise<boolean>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), TIMEOUT),
            ),
          ])
        ) {
          proxies.push(proxy);
          console.log(`connected: ${proxy}`);
          return;
        }

        console.log(`connection failed: ${proxy}`);
      } catch (error) {
        console.log(`connection failed or timed out: ${proxy}`);
      }
    },
    CONCURRENCIES.proxy,
  );

  if (!proxies.length) {
    console.log('no proxies connected');
    await delay(1);
  }

  console.log(`connected proxies length: ${proxies.length}`);

  return proxies;
};
