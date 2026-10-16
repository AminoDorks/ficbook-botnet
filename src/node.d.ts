declare global {
  namespace NodeJS {
    interface ProcessEnv {
      HOST: string;
      TOR_CONTROL_PORT: number;
      TOR_CONTROL_PASSWORD: string;
    }
  }
}

export {};
