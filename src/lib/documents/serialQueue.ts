/**
 * Kører async-opgaver i den rækkefølge de blev sat i kø.
 * En langsom opgave kan ikke gøre sig færdig efter en nyere og overskrive den.
 */
export function createSerialQueue() {
  let tail: Promise<void> = Promise.resolve();

  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };
}
