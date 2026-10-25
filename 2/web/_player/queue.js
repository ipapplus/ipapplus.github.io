export class FolderQueue {
  constructor(random = Math.random) { this.random = random; this.order = []; this.index = 0; this.shuffle = false; this.repeat = 'off'; }
  get current() { return this.order[this.index] ?? null; }
  set(ids, current) {
    this.ids = [...ids];
    const remaining = ids.filter(id => id !== current);
    if (this.shuffle) {
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      this.order = [current, ...remaining]; this.index = 0;
    } else { this.order = [...ids]; this.index = Math.max(0, this.order.indexOf(current)); }
  }
  setShuffle(value) { this.shuffle = value; if (this.ids?.length) this.set(this.ids, this.current); }
  next(ended = false) {
    if (!this.order.length) return null;
    if (ended && this.repeat === 'track') return this.current;
    if (this.index + 1 < this.order.length) return this.order[++this.index];
    if (this.repeat !== 'folder') return null;
    if (this.shuffle && this.ids.length > 1) {
      const last = this.current;
      this.set(this.ids, last);
      this.order.push(this.order.shift()); this.index = 0;
    } else this.index = 0;
    return this.current;
  }
  previous() {
    if (this.index > 0) this.index--;
    else if (this.repeat === 'folder') this.index = Math.max(0, this.order.length - 1);
    return this.current;
  }
}
