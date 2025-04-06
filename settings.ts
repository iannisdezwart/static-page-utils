type LogLevel = "debug" | "info" | "warn" | "error";

export type Settings = {
  webroot: string;
  cacheDir: string;
  logger: (lvl: LogLevel, msg: string) => void;
};
