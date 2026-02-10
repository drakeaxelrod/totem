import type { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";

const btn =
  "w-8 h-8 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer";

const Titlebar: FunctionComponent = () => {
  const win = getCurrentWindow();
  const [pinned, setPinned] = useState(false);

  const togglePin = async () => {
    const next = !pinned;
    await win.setAlwaysOnTop(next);
    setPinned(next);
  };

  return (
    <div
      data-tauri-drag-region
      class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between h-10 px-3 select-none"
    >
      <span
        data-tauri-drag-region
        class="text-[13px] font-extrabold text-slate-400 dark:text-slate-500 tracking-[0.25em]"
      >
        TOTEM
      </span>

      <div class="flex items-center gap-0.5">
        <button
          onClick={togglePin}
          class={
            pinned
              ? "w-8 h-8 flex items-center justify-center rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 cursor-pointer"
              : btn
          }
          title={pinned ? "Unpin from top" : "Pin on top"}
        >
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            class={`w-3.5 h-3.5 ${pinned ? "" : "rotate-45"}`}
          >
            <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1-.707.707c-.348-.348-.706-.463-1.06-.397-.395.072-.764.358-1.048.641-.193.194-.38.414-.558.622L8.25 10.9a.5.5 0 0 1-.354.147H5.96l-2.46 2.46a.5.5 0 0 1-.707-.707L5.25 10.34V8.104a.5.5 0 0 1 .146-.354l3.508-3.508c.208-.178.428-.365.622-.558.283-.284.569-.653.641-1.048.066-.354-.049-.712-.397-1.06a.5.5 0 0 1 .146-.854z" />
          </svg>
        </button>

        <div class="w-2" />

        <button onClick={() => win.minimize()} class={btn} title="Minimize">
          <svg viewBox="0 0 10 1" class="w-2.5">
            <rect fill="currentColor" width="10" height="1" />
          </svg>
        </button>

        <button onClick={() => win.toggleMaximize()} class={btn} title="Maximize">
          <svg viewBox="0 0 10 10" class="w-2.5">
            <rect fill="none" stroke="currentColor" stroke-width="1.5" x="0.75" y="0.75" width="8.5" height="8.5" />
          </svg>
        </button>

        <button
          onClick={() => win.close()}
          class="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 dark:text-slate-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <svg viewBox="0 0 10 10" class="w-2.5">
            <line stroke="currentColor" stroke-width="1.5" x1="1" y1="1" x2="9" y2="9" />
            <line stroke="currentColor" stroke-width="1.5" x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Titlebar;
