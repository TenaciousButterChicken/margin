"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ChannelBus, type ChannelValue } from "./channels";

// React glue around ChannelBus. Provides:
//  • <LabProvider>           — owns one ChannelBus instance for a lab session
//  • useChannel(name)        — reactive read of the current value
//  • usePulseToken(name)     — reactive read of the most recent pulse counter
//  • usePublish()            — returns set/pulse/reset functions
//
// Every widget mounts inside <LabProvider> and uses these hooks. No props
// drilling, no prop-passing between siblings.

const Ctx = createContext<ChannelBus | null>(null);

export function LabProvider({ children }: { children: React.ReactNode }) {
  const busRef = useRef<ChannelBus | null>(null);
  if (!busRef.current) busRef.current = new ChannelBus();
  return <Ctx.Provider value={busRef.current}>{children}</Ctx.Provider>;
}

function useBus(): ChannelBus {
  const bus = useContext(Ctx);
  if (!bus) throw new Error("useBus called outside <LabProvider>");
  return bus;
}

export function useChannel<T = ChannelValue>(name: string): T | undefined {
  const bus = useBus();
  const [value, setValue] = useState<T | undefined>(() => bus.get<T>(name));
  useEffect(() => {
    return bus.subscribe(name, (v) => setValue(v as T | undefined));
  }, [bus, name]);
  return value;
}

export function usePulseToken(name: string): number {
  const bus = useBus();
  const [token, setToken] = useState<number>(() => (bus.get<number>(name) as number) ?? 0);
  useEffect(() => {
    return bus.subscribe(name, (v) => {
      if (typeof v === "number") setToken(v);
    });
  }, [bus, name]);
  return token;
}

export function usePublish() {
  const bus = useBus();
  return {
    set: (channel: string, value: ChannelValue) => bus.set(channel, value),
    pulse: (channel: string) => bus.pulse(channel),
    reset: () => bus.reset(),
    get: <T = ChannelValue>(channel: string) => bus.get<T>(channel),
  };
}
