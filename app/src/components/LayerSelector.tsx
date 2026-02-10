import type { FunctionComponent } from "preact";

interface LayerSelectorProps {
  layers: string[];
  activeLayer: number;
  onSelect: (index: number) => void;
}

const LayerSelector: FunctionComponent<LayerSelectorProps> = ({
  layers,
  activeLayer,
  onSelect,
}) => {
  return (
    <div class="inline-flex gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
      {layers.map((name, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          class={`px-4 py-1.5 rounded-lg text-[13px] font-semibold tracking-wide uppercase cursor-pointer transition-colors ${
            activeLayer === i
              ? "bg-blue-500 text-white shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
};

export default LayerSelector;
