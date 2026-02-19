import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useCallback, useRef } from "preact/hooks";

// ── Types matching Rust Tauri commands ──

interface DeviceInfo {
  id: string;
  name: string;
  transport: "Usb" | "Ble";
}

interface ConnectedDeviceInfo {
  name: string;
  serial_number: string;
  transport: "Usb" | "Ble";
}

interface BatteryInfo {
  levels: number[];
}

// ── Connection status ──

export type ConnectionStatus =
  | { state: "disconnected" }
  | { state: "scanning" }
  | { state: "connecting"; device: DeviceInfo }
  | { state: "connected"; info: ConnectedDeviceInfo };

// ── Battery indicator ──

function BatteryIndicator({
  label,
  level,
}: {
  label: string;
  level: number;
}) {
  const color =
    level > 50 ? "bg-[#a6e3a1]" : level > 20 ? "bg-[#f9e2af]" : "bg-[#f38ba8]";
  return (
    <div class="flex items-center gap-2">
      <span class="text-xs text-subtext w-8">{label}</span>
      <div class="flex-1 h-2 bg-surface rounded-full overflow-hidden">
        <div
          class={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
        />
      </div>
      <span class="text-xs text-text tabular-nums w-8 text-right">{level}%</span>
    </div>
  );
}

// ── Connection status badge (for header) ──

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const dotColor = {
    disconnected: "bg-overlay",
    scanning: "bg-[#f9e2af] animate-pulse",
    connecting: "bg-[#f9e2af] animate-pulse",
    connected: "bg-[#a6e3a1]",
  }[status.state];

  const label = {
    disconnected: "Disconnected",
    scanning: "Scanning...",
    connecting: "Connecting...",
    connected:
      status.state === "connected"
        ? `${status.info.transport === "Usb" ? "USB" : "BLE"}`
        : "",
  }[status.state];

  return (
    <span class="flex items-center gap-1.5 text-xs text-subtext">
      <span class={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

// ── Monitor panel ──

const HALF_LABELS = ["L", "R"];

export function MonitorPanel({
  status,
  onConnect,
  onDisconnect,
}: {
  status: ConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [lockState, setLockState] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scan for devices when disconnected
  const doScan = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const found = await invoke<DeviceInfo[]>("list_devices");
      setDevices(found);
    } catch (e) {
      console.error("Scan failed:", e);
    } finally {
      setScanning(false);
    }
  }, [scanning]);

  // Auto-scan on mount and periodically when disconnected
  useEffect(() => {
    if (status.state !== "disconnected") {
      if (scanRef.current) {
        clearInterval(scanRef.current);
        scanRef.current = null;
      }
      return;
    }
    doScan(); // Immediate scan
    scanRef.current = setInterval(doScan, 5000); // Re-scan every 5s
    return () => {
      if (scanRef.current) clearInterval(scanRef.current);
    };
  }, [status.state]);

  // Toggle lock state
  const handleToggleLock = useCallback(async () => {
    if (!lockState) return;
    setToggling(true);
    try {
      const shouldLock = lockState === "ZmkUnlocked";
      await invoke("set_lock_state", { lock: shouldLock });
      setTimeout(async () => {
        try {
          const newState = await invoke<string>("get_lock_state");
          setLockState(newState);
        } catch { /* ignore */ }
        setToggling(false);
      }, 500);
    } catch (e) {
      console.error("Lock toggle failed:", e);
      setToggling(false);
    }
  }, [lockState]);

  // Poll battery + lock state when connected
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
        // Connection may have dropped
      }
    };

    poll();
    pollRef.current = setInterval(poll, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status.state]);

  const isLocked = lockState !== "ZmkUnlocked";

  return (
    <div class="flex flex-col h-full overflow-y-auto p-3 gap-3">
      {/* Disconnected: auto-scanning, show devices */}
      {status.state === "disconnected" && (
        <>
          {scanning && devices.length === 0 && (
            <div class="text-xs text-subtext animate-pulse text-center py-4">
              Scanning for devices...
            </div>
          )}

          {devices.length > 0 && (
            <div class="flex flex-col gap-1">
              {devices.map((d) => (
                <button
                  key={d.id}
                  class="flex items-center justify-between px-3 py-2 rounded
                         bg-surface hover:bg-overlay/20 transition-colors text-left"
                  onClick={onConnect}
                  data-device-id={d.id}
                  data-transport={d.transport}
                >
                  <div>
                    <div class="text-xs font-medium text-text">{d.name}</div>
                    <div class="text-xs text-subtext">{d.transport === "Usb" ? "USB" : "Bluetooth"}</div>
                  </div>
                  <span class="text-xs text-primary font-medium">Connect</span>
                </button>
              ))}
            </div>
          )}

          {devices.length === 0 && !scanning && (
            <p class="text-xs text-subtext text-center py-4">
              No devices found. Retrying...
            </p>
          )}
        </>
      )}

      {status.state === "connecting" && (
        <div class="text-xs text-subtext animate-pulse text-center py-6">
          Connecting to {status.device.name}...
        </div>
      )}

      {status.state === "connected" && (
        <>
          {/* Device info */}
          <div class="bg-surface rounded px-3 py-2">
            <div class="text-xs font-medium text-text">{status.info.name}</div>
            <div class="text-xs text-subtext mt-0.5">
              {status.info.transport === "Usb" ? "USB" : "Bluetooth"} · {status.info.serial_number.slice(0, 12)}
            </div>
          </div>

          {/* Lock state */}
          {lockState && (
            <div class="flex items-center justify-between px-1">
              <span class="text-xs text-subtext">
                Studio: <span class={isLocked ? "text-[#f9e2af]" : "text-[#a6e3a1]"}>
                  {isLocked ? "Locked" : "Unlocked"}
                </span>
              </span>
              <button
                class={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  toggling
                    ? "bg-overlay/30 text-subtext cursor-wait"
                    : isLocked
                      ? "bg-[#a6e3a1]/15 text-[#a6e3a1] hover:bg-[#a6e3a1]/25"
                      : "bg-[#f9e2af]/15 text-[#f9e2af] hover:bg-[#f9e2af]/25"
                }`}
                onClick={handleToggleLock}
                disabled={toggling}
              >
                {toggling ? "..." : isLocked ? "Unlock" : "Lock"}
              </button>
            </div>
          )}

          {/* Battery */}
          {battery && battery.levels.length > 0 && (
            <div class="flex flex-col gap-1.5 px-1">
              <span class="text-xs text-subtext font-medium">Battery</span>
              {battery.levels.map((level, i) => (
                <BatteryIndicator
                  key={i}
                  label={HALF_LABELS[i] ?? `${i}`}
                  level={level}
                />
              ))}
            </div>
          )}

          {/* Disconnect */}
          <button
            class="mt-auto py-1.5 rounded text-xs font-medium text-[#f38ba8]/70
                   hover:text-[#f38ba8] hover:bg-[#f38ba8]/10 transition-colors"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}
