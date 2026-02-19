import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useRef, useCallback } from "preact/hooks";
import type { OutputLine } from "./BuildConsole.tsx";
import type { DeviceInfo, ConnectedDeviceInfo, ConnectionStatus } from "../lib/types.ts";

// ── Types ──

interface BatteryInfo {
  levels: number[];
}

// ── Status Bar (unified with build output) ──

export function StatusBar({
  status,
  onStatusChange,
  buildLines,
  buildExitCode,
  buildExpanded,
  setBuildExpanded,
  building,
}: {
  status: ConnectionStatus;
  onStatusChange: (s: ConnectionStatus) => void;
  buildLines: OutputLine[];
  buildExitCode: number | null;
  buildExpanded: boolean;
  setBuildExpanded: (v: boolean) => void;
  building: boolean;
}) {
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [lockState, setLockState] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scan when disconnected
  useEffect(() => {
    if (status.state !== "disconnected") {
      if (scanRef.current) {
        clearInterval(scanRef.current);
        scanRef.current = null;
      }
      return;
    }

    const scan = async () => {
      try {
        const found = await invoke<DeviceInfo[]>("list_devices");
        setDevices(found);
      } catch {
        // ignore
      }
    };

    scan();
    scanRef.current = setInterval(scan, 4000);
    return () => {
      if (scanRef.current) clearInterval(scanRef.current);
    };
  }, [status.state]);

  // Auto-connect to first found device
  useEffect(() => {
    if (status.state !== "disconnected" || devices.length === 0) return;

    const device = devices[0];
    onStatusChange({ state: "connecting", device });

    (async () => {
      try {
        const info = await invoke<ConnectedDeviceInfo>("connect_device", {
          deviceId: device.id,
          transport: device.transport,
        });
        onStatusChange({ state: "connected", info, locked: true });
      } catch (e) {
        console.error("Auto-connect failed:", e);
        onStatusChange({ state: "disconnected" });
      }
    })();
  }, [devices, status.state]);

  // Poll battery + lock when connected
  useEffect(() => {
    if (status.state !== "connected") {
      setBattery(null);
      setLockState(null);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const poll = async () => {
      try {
        const [bat, lock] = await Promise.allSettled([
          invoke<BatteryInfo>("get_battery"),
          invoke<string>("get_lock_state"),
        ]);
        if (bat.status === "fulfilled") setBattery(bat.value);
        if (lock.status === "fulfilled") setLockState(lock.value);
      } catch {
        // ignore
      }
    };

    poll();
    pollRef.current = setInterval(poll, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status.state]);

  // Propagate lock state changes to parent
  useEffect(() => {
    if (status.state === "connected" && lockState !== null) {
      const locked = lockState !== "unlocked";
      if (status.locked !== locked) {
        onStatusChange({ ...status, locked });
      }
    }
  }, [lockState, status]);

  // Auto-scroll build output
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [buildLines]);

  const handleToggleLock = useCallback(async () => {
    if (!lockState) return;
    const wantLock = lockState === "unlocked";
    setToggling(true);
    try {
      await invoke("set_lock_state", { lock: wantLock });
      if (wantLock) {
        // Locking is immediate — single poll
        try {
          const s = await invoke<string>("get_lock_state");
          setLockState(s);
        } catch { /* ignore */ }
        setToggling(false);
      } else {
        // Unlocking requires physical confirmation — poll for up to 15s
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          try {
            const s = await invoke<string>("get_lock_state");
            if (s === "unlocked" || attempts >= 30) {
              clearInterval(poll);
              setLockState(s);
              setToggling(false);
            }
          } catch {
            clearInterval(poll);
            setToggling(false);
          }
        }, 500);
      }
    } catch {
      setToggling(false);
    }
  }, [lockState]);

  const handleDisconnect = useCallback(async () => {
    try {
      await invoke("disconnect_device");
    } catch { /* ignore */ }
    onStatusChange({ state: "disconnected" });
  }, [onStatusChange]);

  const handleReconnect = useCallback(async () => {
    try {
      await invoke("disconnect_device");
    } catch { /* ignore */ }
    setBattery(null);
    setLockState(null);
    setDevices([]);
    onStatusChange({ state: "disconnected" });
  }, [onStatusChange]);

  const isLocked = lockState !== null && lockState !== "unlocked";

  const dotClass = {
    disconnected: "bg-overlay",
    scanning: "bg-[#f9e2af] animate-pulse",
    connecting: "bg-[#f9e2af] animate-pulse",
    connected: "bg-[#a6e3a1]",
  }[status.state];

  const hasBuild = building || buildLines.length > 0;

  const lineColor = (kind: OutputLine["kind"]) => {
    switch (kind) {
      case "stdout":
        return "text-text";
      case "stderr":
        return "text-[#f9e2af]";
      case "status":
        return buildExitCode === 0 ? "text-[#a6e3a1]" : "text-[#f38ba8]";
    }
  };

  return (
    <div class="flex flex-col shrink-0">
      {/* Build output (expandable above the bar) */}
      {buildExpanded && buildLines.length > 0 && (
        <div
          ref={outputRef}
          class="bg-[#11111b] max-h-64 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed border-t border-overlay/30"
        >
          {buildLines.map((line, i) => (
            <div key={i} class={lineColor(line.kind)}>
              {line.text || "\u00a0"}
            </div>
          ))}
        </div>
      )}

      {/* Status bar */}
      <div class="flex items-center gap-4 px-4 h-7 bg-surface-alt border-t border-overlay/30 text-xs shrink-0">
        {/* Connection status */}
        <div class="flex items-center gap-1.5 text-subtext">
          <span class={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
          {status.state === "disconnected" && "No device"}
          {status.state === "scanning" && "Scanning..."}
          {status.state === "connecting" && `Connecting to ${status.device.name}...`}
          {status.state === "connected" && (
            <span class="text-text">
              {status.info.name}
              <span class="text-subtext ml-1">
                ({status.info.transport === "Usb" ? "USB" : "BLE"})
              </span>
            </span>
          )}
        </div>

        {/* Battery levels */}
        {battery && battery.levels.length > 0 && (
          <div class="flex items-center gap-2 text-subtext">
            {battery.levels.map((level, i) => {
              const color = level > 50 ? "text-[#a6e3a1]" : level > 20 ? "text-[#f9e2af]" : "text-[#f38ba8]";
              const label = ["L", "R"][i] ?? `${i}`;
              return (
                <span key={i} class="flex items-center gap-0.5">
                  <span>{label}</span>
                  <span class={color}>{level}%</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Lock state */}
        {lockState && (
          <button
            class={`flex items-center gap-1 transition-colors ${
              toggling ? "text-subtext cursor-wait" : "text-subtext hover:text-text"
            }`}
            onClick={handleToggleLock}
            disabled={toggling}
          >
            Studio: <span class={isLocked ? "text-[#f9e2af]" : "text-[#a6e3a1]"}>
              {toggling && isLocked ? "Confirm on keyboard..." : isLocked ? "Locked" : "Unlocked"}
            </span>
          </button>
        )}

        <div class="flex-1" />

        {/* Build status */}
        {hasBuild && (
          <button
            class={`flex items-center gap-1 transition-colors ${
              building
                ? "text-[#f9e2af]"
                : buildExitCode === 0
                  ? "text-[#a6e3a1] hover:text-[#a6e3a1]/80"
                  : "text-[#f38ba8] hover:text-[#f38ba8]/80"
            }`}
            onClick={() => setBuildExpanded(!buildExpanded)}
          >
            {building
              ? "Building..."
              : buildExitCode === 0
                ? "Build: OK"
                : `Build: Failed (${buildExitCode})`}
            <span class="text-subtext">{buildExpanded ? "▾" : "▸"}</span>
          </button>
        )}

        {/* Connection controls */}
        {status.state === "connected" && (
          <>
            <button
              class="text-subtext hover:text-[#f9e2af] transition-colors"
              onClick={handleReconnect}
              title="Disconnect and reconnect"
            >
              Reconnect
            </button>
            <button
              class="text-subtext hover:text-[#f38ba8] transition-colors"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}
