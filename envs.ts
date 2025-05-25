import type { DisposableEnv, EnvBuilder } from "./src/zod-enpoints";
import im from "immutable";

type DbEnv = {
  save: <T>(item: T) => Promise<void>;
  find_by: <T>(filter: Partial<T>) => Promise<T[]>;
};

type LoggerEnv = {
  info: (...data: any[]) => void;
  error: (...data: any[]) => void;
};

export const logger_env: EnvBuilder<LoggerEnv> = async ({ request }) => {
  return {
    value: {
      info: console.log,
      error: console.error,
    },
    dispose: async ({ result, error }) => {},
  };
};

let store = im.List<any>();

export const db_env =
  (tx_level: string) =>
  async (args: any): Promise<DisposableEnv<DbEnv>> => {
    const db: any = {
      commit: async () => {
        console.log("committed");
      },
      rollback: async () => {
        console.log("rolled back");
      },
      release: async () => {
        console.log("released");
      },
      save: async <T>(item: T) => {
        store = store.push(item);
        console.log("item saved", item);
      },
      find_by: async <T>(filter: Partial<T>) => {
        console.log("find_by with filter", filter);

        const items = store.filter((item) => {
          return Object.entries(filter).every(([key, value]) => {
            return item[key] === value;
          });
        });

        return items.toArray();
      },
    };

    console.log("tx_opened with level:", tx_level);

    return {
      value: {
        save: db.save,
        find_by: db.find_by,
      },
      dispose: async ({ result, error }) => {
        if (result) await db.commit();
        if (error) await db.rollback();
        await db.release();
      },
    };
  };
