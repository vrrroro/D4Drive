import { FILM_MANIFEST, frameSrc } from '@/lib/film-manifest';
import { bootSet, loadOrder } from './timeline';

/**
 * Fetches the film's stills in coarse-to-fine order (timeline.loadOrder) with
 * a small number of requests in flight, and answers "what is the closest
 * frame I can draw right now" while the rest arrive.
 *
 * Images are kept as HTMLImageElements and decoded by the browser on first
 * draw, not pre-decoded into ImageBitmaps: 264 decoded 1600x900 frames would
 * pin about 1.5 GB, and mobile Safari kills tabs for far less.
 */
export class FrameLoader {
  readonly count = FILM_MANIFEST.count;
  private readonly frames: (HTMLImageElement | null)[];
  private readonly queue: number[];
  private readonly required: Set<number>;
  private requiredDone = 0;
  private inFlight = 0;
  private disposed = false;

  constructor(
    step: 1 | 2,
    private readonly onFrame: (index: number) => void,
    private readonly onBootProgress: (fraction: number) => void,
    private readonly concurrency = 6,
  ) {
    this.frames = new Array<HTMLImageElement | null>(this.count).fill(null);
    this.queue = loadOrder(this.count, step);
    this.required = new Set(bootSet(this.count, step));
  }

  start(): void {
    for (let i = 0; i < this.concurrency; i += 1) this.next();
  }

  dispose(): void {
    this.disposed = true;
    this.queue.length = 0;
  }

  get bootFraction(): number {
    return this.requiredDone / this.required.size;
  }

  /** The loaded frame nearest to `index`, preferring the one just behind. */
  nearest(index: number): HTMLImageElement | null {
    const i = Math.round(index);
    for (let d = 0; d < this.count; d += 1) {
      const behind = this.frames[i - d];
      if (behind) return behind;
      const ahead = this.frames[i + d];
      if (ahead) return ahead;
      if (i - d < 0 && i + d >= this.count) break;
    }
    return null;
  }

  /** Exactly this frame, if it has arrived. */
  exact(index: number): HTMLImageElement | null {
    return this.frames[index] ?? null;
  }

  private lastWarm = -1;
  private readonly warming = new Set<number>();

  /**
   * Ask the browser to decode the stills just ahead of the playhead, in the
   * direction it is moving, off the main thread (`img.decode()`). Without
   * this the first draw of each still decodes synchronously inside drawImage,
   * which is the hitch a fast scroll felt as judder. The browser still owns
   * the decoded pixels and may drop them under memory pressure; nothing is
   * pinned here.
   */
  warm(index: number, step: number): void {
    const i = Math.round(index);
    if (i === this.lastWarm) return;
    const direction = i >= this.lastWarm ? 1 : -1;
    this.lastWarm = i;
    for (let k = 1; k <= 8; k += 1) {
      const j = i + direction * k * step;
      const img = this.frames[j];
      if (!img || this.warming.has(j)) continue;
      this.warming.add(j);
      img
        .decode()
        .catch(() => undefined)
        .finally(() => this.warming.delete(j));
    }
  }

  private next(): void {
    if (this.disposed) return;
    const index = this.queue.shift();
    if (index === undefined) return;
    this.inFlight += 1;

    const img = new Image();
    img.decoding = 'async';
    const settle = (ok: boolean) => {
      this.inFlight -= 1;
      if (this.disposed) return;
      if (ok) {
        this.frames[index] = img;
        this.onFrame(index);
      }
      // A failed frame still counts toward boot: the nearest neighbour
      // covers it, and a missing still must never strand the loader.
      if (this.required.has(index)) {
        this.requiredDone += 1;
        this.onBootProgress(this.bootFraction);
      }
      this.next();
    };
    // Decoded before it is offered for drawing, so its first draw is cheap.
    img.onload = () => {
      img.decode().then(
        () => settle(true),
        () => settle(true),
      );
    };
    img.onerror = () => settle(false);
    img.src = frameSrc(index);
  }
}
