type Snapshot = {
  textItems?: Array<{ index?: number; [k: string]: any }>;
  imageItems?: Array<{ index?: number; [k: string]: any }>;
  // legacy fallbacks:
  textImages?: Array<{ index?: number; [k: string]: any }>;
  [k: string]: any;
};

export type Stacks = Record<number, Snapshot[] | any>;

export function remapStacksAfterPageRemoval(
  prevStacks: Stacks | undefined,
  removedPage: number
): Stacks {
  const next: Stacks = {};
  for (const [k, snapshots] of Object.entries(prevStacks || {})) {
    const keyNum = Number(k);
    if (keyNum === removedPage) continue; // drop this page entirely

    const newKey = keyNum > removedPage ? keyNum - 1 : keyNum;

    const adjSnapshots = Array.isArray(snapshots)
      ? snapshots.map((snap: Snapshot) => {
          const copy: Snapshot = { ...snap };
          const fixArr = (arrName: keyof Snapshot) => {
            const arr = copy[arrName] as any[] | undefined;
            if (!Array.isArray(arr)) return;
            copy[arrName] = arr.map((it: any) =>
              it && typeof it.index === "number" && it.index === keyNum
                ? { ...it, index: newKey }
                : it
            ) as any;
          };
          fixArr("textItems");
          fixArr("imageItems");
          fixArr("textImages"); // legacy
          return copy;
        })
      : snapshots;

    next[newKey] = adjSnapshots;
  }
  return next;
}