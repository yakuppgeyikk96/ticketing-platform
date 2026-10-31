export type Handler = (payload: unknown) => Promise<void>;

export const handlers: Record<string, Handler> = {
  "user.registered": async (payload) => {
    console.log(payload);
    return new Promise((resolve) => resolve());
  },
};

export const handledTypes = Object.keys(handlers);
