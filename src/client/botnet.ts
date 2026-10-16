import { Ficbook } from 'ficbook';
import { Tor } from 'tor-control-ts';

import { initCache } from '../util/cache';
import { findProxies, loadAccounts } from '../util/helpers';
import { poolProxies } from '../util/pools';
import { many, pool } from '../util/tasks';
import type { CachedUnit } from '../types/cache';
import { ACTIONS, CONCURRENCIES } from '../constants';

export class Botnet {
  private mainContext?: Ficbook;
  private contexts: Ficbook[] = [];

  private tor: Tor = new Tor({
    host: process.env.HOST,
    port: process.env.TOR_CONTROL_PORT,
    password: process.env.TOR_CONTROL_PASSWORD,
  });

  private setupContexts = async () => {
    const accounts = await loadAccounts();
    const proxies = await poolProxies(await findProxies());
    const batchSize = Math.floor(accounts.length / proxies.length);

    await this.tor.signalNewnym();

    await many<string, CachedUnit>(
      proxies,
      accounts,
      batchSize,
      async (proxy, units) => {
        for (const unit of units) {
          const ficbook = new Ficbook();
          ficbook.proxy = proxy;
          await ficbook.auth.login(unit.rme, unit.phpSessionId);
          this.contexts.push(ficbook);
        }
      },
    );

    console.log(
      `successfully loaded ${this.contexts.length} contexts\naccounts per proxy: ${batchSize}`,
    );
  };

  private commentToAll = async () => {
    const comment = prompt('comment: ')!;

    const partIds = (
      await Promise.all(
        (await this.mainContext!.fanfic.fanfiction()).map(async (fanfic) =>
          (await this.mainContext!.fanfic.parts(fanfic)).map((part) => part.id),
        ),
      )
    ).flat();

    await pool<Ficbook>(
      this.contexts,
      async (ficbook) => {
        for (const partId of partIds) {
          try {
            await ficbook.fanfic.comment(partId, comment);
            console.log(`[${partId}]: commented`);
          } catch (e) {
            console.log(`can't do: ${e}`);
          }
        }
      },
      CONCURRENCIES.contexts,
    );
  };

  private commentToOne = async () => {
    const partId = Number(prompt('part id: ')!);
    const comment = prompt('comment: ')!;

    await pool<Ficbook>(
      this.contexts,
      async (ficbook) => {
        try {
          while (true) {
            await ficbook.fanfic.comment(partId, comment);
            console.log(`[${new Date().toISOString()}][${partId}]: commented`);
          }
        } catch (e) {
          console.log(`can't do: ${e}`);
        }
      },
      CONCURRENCIES.contexts,
    );
  };

  private dmToAll = async () => {
    const text = prompt('text: ')!;

    const userIds = (await this.mainContext!.user.top()).map((user) =>
      user.id.toString(),
    );

    await pool<Ficbook>(
      this.contexts,
      async (ficbook) => {
        for (const userId of userIds) {
          try {
            await ficbook.user.text(
              (await ficbook.user.createThread(userId)).id,
              text,
            );
            console.log(`[${userId}] wrote`);
          } catch (e) {
            console.log(`can't do: ${e}`);
          }
        }
      },
      CONCURRENCIES.contexts,
    );
  };

  private dmToOne = async () => {
    const text = prompt('text: ')!;
    const userId = prompt('user id: ')!;

    await pool<Ficbook>(
      this.contexts,
      async (ficbook) => {
        try {
          while (true) {
            await ficbook.user.text(
              (await ficbook.user.createThread(userId)).id,
              text,
            );
            console.log(`[${new Date().toISOString()}][${userId}] wrote`);
          }
        } catch (e) {
          console.log(`can't do: ${e}`);
        }
      },
      CONCURRENCIES.contexts,
    );
  };

  private createFanfic = async () => {
    const title = prompt('title: ')!;
    const description = prompt('description: ')!;
    const fandomId = prompt('fandom id: ')!;
    const partTitle = prompt('part title: ')!;
    const content = prompt('part content: ')!;

    await pool<Ficbook>(
      this.contexts,
      async (ficbook) => {
        try {
          const fanficId = (
            await ficbook.fanfic.create({
              title,
              fandomId,
              description,
            })
          ).toString();
          await ficbook.fanfic.addPart({ fanficId, title: partTitle, content });

          console.log(`[${fanficId}] wrote`);
        } catch (e) {
          console.log(`can't do: ${e}`);
        }
      },
      CONCURRENCIES.contexts,
    );
  };

  private commentBlog = async () => {
    const blogId = prompt('blog id: ')!;
    const text = prompt('text: ')!;

    await pool<Ficbook>(
      this.contexts,
      async (ficbook) => {
        try {
          await ficbook.blog.comment(blogId, text);

          console.log(`[${blogId}] commented`);
        } catch (e) {
          console.log(`can't do: ${e}`);
        }
      },
      CONCURRENCIES.contexts,
    );
  };

  private likeFanfic = async () => {
    const fanficId = prompt('fanfic id: ')!;

    await pool<Ficbook>(
      this.contexts,
      async (ficbook) => {
        try {
          await ficbook.fanfic.like(fanficId);

          console.log(`[${fanficId}] liked`);
        } catch (e) {
          console.log(`can't do: ${e}`);
        }
      },
      CONCURRENCIES.contexts,
    );
  };

  public run = async () => {
    await initCache();
    await this.tor.connect();
    await this.setupContexts();

    this.mainContext = this.contexts[0];

    while (true) {
      console.log(ACTIONS.join('\n'));

      switch (prompt('action: ')) {
        case '1':
          await this.commentToAll();
          break;
        case '2':
          await this.commentToOne();
          break;
        case '3':
          await this.dmToAll();
          break;
        case '4':
          await this.dmToOne();
          break;
        case '5':
          await this.createFanfic();
          break;
        case '6':
          await this.commentBlog();
          break;
        case '7':
          await this.likeFanfic();
          break;
      }
    }
  };
}
