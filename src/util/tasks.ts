export const pool = async <T>(
  props: T[],
  callback: (arg: T) => Promise<void>,
  maxConcurrency: number,
): Promise<void> => {
  const queue = [...props];
  const promises: Promise<void>[] = [];

  for (let i = 0; i < Math.min(maxConcurrency, props.length); i++) {
    const worker = async () => {
      while (queue.length) {
        const prop = queue.shift();
        if (prop) {
          await callback(prop);
        }
      }
    };
    promises.push(worker());
  }

  await Promise.all(promises);
};

export const many = async <T, U>(
  firstArray: T[],
  secondArray: U[],
  batchSize: number,
  processor: (firstArrayElement: T, secondArray: U[]) => Promise<void>,
): Promise<void> => {
  const promises = [];

  for (let i = 0; i < firstArray.length; i++) {
    const start = i * batchSize;
    const end = start + batchSize;

    if (start >= secondArray.length) break;

    const worker = async () => {
      const batch = secondArray.slice(start, end);
      await processor(firstArray[i]!, batch);
    };
    promises.push(worker());
  }

  await Promise.all(promises);
};
