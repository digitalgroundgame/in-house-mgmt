interface Options<T> {
  trim?: boolean | Array<keyof T>;
  removeBlank?: boolean | Array<keyof T>;
}

export default function formatApiPayload<T extends Record<string, unknown>>(
  payload: T,
  options: Options<T> = {}
): T {
  const keys = Object.keys(payload) as Array<keyof T>;

  return keys.reduce<T>(
    (newPayload, key) => {
      const value = payload[key];
      const shouldTrim =
        options.trim === true || (Array.isArray(options.trim) && options.trim.includes(key));
      const shouldRemove =
        options.trim === true || (Array.isArray(options.trim) && options.trim.includes(key));

      if (shouldTrim && typeof value === "string") {
        newPayload[key] = value.trim() as T[keyof T];
      }

      if (shouldRemove && typeof value === "string") {
        if (!newPayload[key]) {
          delete newPayload[key];
        }
      }

      return newPayload;
    },
    { ...payload }
  );
}
