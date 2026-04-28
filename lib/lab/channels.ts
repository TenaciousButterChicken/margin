// Tiny channel runtime — the spine that every Lab widget reads/writes through.
// Per the approved schema, widgets declare `publishes: string[]` and
// `subscribes: string[]`. The runtime keeps a mutable bag of channel values
// and notifies subscribers whenever something gets published.
//
// Two flavors of write:
//  • set(channel, value)   — durable; everyone who later subscribes also reads it
//  • pulse(channel)        — fire-and-forget; current subscribers fire once, no value retained
//
// Action buttons (Step ×4, Reset) use pulse(). Sliders use set(). Continuous
// state like the simulator's history uses set().

export type ChannelValue = unknown;
type Listener = (value: ChannelValue) => void;

export class ChannelBus {
  private values = new Map<string, ChannelValue>();
  private listeners = new Map<string, Set<Listener>>();
  private pulseTokens = new Map<string, number>(); // monotonic counter per channel

  get<T = ChannelValue>(channel: string): T | undefined {
    return this.values.get(channel) as T | undefined;
  }

  set(channel: string, value: ChannelValue): void {
    this.values.set(channel, value);
    this.fire(channel, value);
  }

  pulse(channel: string): void {
    const t = (this.pulseTokens.get(channel) ?? 0) + 1;
    this.pulseTokens.set(channel, t);
    // Pulses are tracked by token so subscribers can see "something happened"
    // even if the value is the same. Subscribers compare against the previous
    // token they saw.
    this.fire(channel, t);
  }

  subscribe(channel: string, listener: Listener): () => void {
    let set = this.listeners.get(channel);
    if (!set) {
      set = new Set();
      this.listeners.set(channel, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  reset(): void {
    this.values.clear();
    this.pulseTokens.clear();
    // Notify everyone with undefined so they know to clear local state.
    this.listeners.forEach((set) => {
      set.forEach((fn) => fn(undefined));
    });
  }

  private fire(channel: string, value: ChannelValue): void {
    const set = this.listeners.get(channel);
    if (!set) return;
    set.forEach((fn) => fn(value));
  }
}
