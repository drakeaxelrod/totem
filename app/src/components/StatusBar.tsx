import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useRef, useCallback } from "react";
import { PiBatteryFull, PiBatteryHigh, PiBatteryMedium, PiBatteryLow, PiBatteryEmpty } from "react-icons/pi";
import { useStore } from "../store/index.ts";
import type { OutputLine } from "./BuildConsole.tsx";
import type { DeviceInfo, ConnectedDeviceInfo, ConnectionStatus } from "../lib/types.ts";

function BatteryIcon({ level }: { level: number }) {
  const props = { size: 18 };
  if (level > 87) return <PiBatteryFull {...props} />;
  if (level > 62) return <PiBatteryHigh {...props} />;
  if (level > 37) return <PiBatteryMedium {...props} />;
  if (level > 12) return <PiBatteryLow {...props} />;
  return <PiBatteryEmpty {...props} />;
}

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
  const { behaviorsReady, showToast } = useStore();
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

  const connectTo = useCallback(async (device: DeviceInfo) => {
    onStatusChange({ state: "connecting", device });
    try {
      const info = await invoke<ConnectedDeviceInfo>("connect_device", {
        deviceId: device.id,
        transport: device.transport,
      });
      onStatusChange({ state: "connected", info, locked: true });
    } catch (e) {
      console.error("Connect failed:", e);
      onStatusChange({ state: "disconnected" });
    }
  }, [onStatusChange]);

  // Auto-connect when exactly one device is found
  useEffect(() => {
    if (status.state !== "disconnected" || devices.length !== 1) return;
    connectTo(devices[0]);
  }, [devices, status.state, connectTo]);

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

  const handleSaveToDevice = async () => {
    try {
      await invoke("save_changes_live");
      showToast("Saved to device");
    } catch (e) {
      showToast(`Save failed: ${e}`, "error");
    }
  };

  const handleDiscardDevice = async () => {
    try {
      await invoke("discard_changes_live");
      showToast("Device changes discarded");
    } catch (e) {
      showToast(`Discard failed: ${e}`, "error");
    }
  };

  const isLocked = lockState !== null && lockState !== "unlocked";
  const isUnlocked = status.state === "connected" && !isLocked && behaviorsReady;

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
    <div className="flex flex-col shrink-0">
      {/* Build output (expandable above the bar) */}
      {buildExpanded && buildLines.length > 0 && (
        <div
          ref={outputRef}
          className="bg-[#11111b] max-h-64 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed border-t border-overlay/30"
        >
          {buildLines.map((line, i) => (
            <div key={i} className={lineColor(line.kind)}>
              {line.text || "\u00a0"}
            </div>
          ))}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 h-7 bg-surface-alt border-t border-overlay/30 text-xs shrink-0">
        {/* Connection status */}
        <div className="flex items-center gap-1.5 text-subtext">
          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
          {status.state === "disconnected" && devices.length === 0 && "No device"}
          {status.state === "disconnected" && devices.length > 1 && (
            <span className="flex items-center gap-2">
              {devices.map((d) => (
                <button
                  key={d.id}
                  className="text-text hover:text-primary transition-colors"
                  onClick={() => connectTo(d)}
                >
                  {d.name}
                  <span className="text-subtext ml-0.5">
                    ({d.transport === "Usb" ? "USB" : "BLE"})
                  </span>
                </button>
              ))}
            </span>
          )}
          {status.state === "connecting" && `Connecting to ${status.device.name}...`}
          {status.state === "connected" && (
            <span className="text-text">
              {status.info.name}
              <span className="text-subtext ml-1">
                ({status.info.transport === "Usb" ? "USB" : "BLE"})
              </span>
            </span>
          )}
        </div>

        {/* Battery levels */}
        {battery && battery.levels.length > 0 && (
          <div className="flex items-center gap-2 text-subtext">
            {battery.levels.map((level, i) => {
              const color = level > 50 ? "text-[#a6e3a1]" : level > 20 ? "text-[#f9e2af]" : "text-[#f38ba8]";
              return (
                <span key={i} className={`flex items-center gap-1.5 ${color}`}>
                  <BatteryIcon level={level} />
                  {level}%
                </span>
              );
            })}
          </div>
        )}

        {/* Lock state */}
        {lockState && (
          <button
            className={`flex items-center gap-1 transition-colors ${
              toggling ? "text-subtext cursor-wait" : "text-subtext hover:text-text"
            }`}
            onClick={handleToggleLock}
            disabled={toggling}
          >
            State: <span className={isLocked ? "text-[#f9e2af]" : "text-[#a6e3a1]"}>
              {toggling && isLocked ? "Confirm on keyboard..." : isLocked ? "Locked" : "Unlocked"}
            </span>
          </button>
        )}

        {/* Device save/discard (only when unlocked) */}
        {isUnlocked && (
          <>
            <button
              className="text-[#a6e3a1] hover:text-[#a6e3a1]/80 transition-colors"
              onClick={handleSaveToDevice}
            >
              Save
            </button>
            <button
              className="text-[#f9e2af] hover:text-[#f9e2af]/80 transition-colors"
              onClick={handleDiscardDevice}
            >
              Discard
            </button>
          </>
        )}

        <div className="flex-1" />

        {/* Build status */}
        {hasBuild && (
          <button
            className={`flex items-center gap-1 transition-colors ${
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
            <span className="text-subtext">{buildExpanded ? "\u25BE" : "\u25B8"}</span>
          </button>
        )}

        {/* Connection controls */}
        {status.state === "connected" && (
          <>
            <button
              className="text-subtext hover:text-[#f9e2af] transition-colors"
              onClick={handleReconnect}
              title="Disconnect and reconnect"
            >
              Reconnect
            </button>
            <button
              className="text-subtext hover:text-[#f38ba8] transition-colors"
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
