# ZMK Features Checklist

Implementation status of all ZMK features in the TOTEM configurator app.

**Legend:**
- **Full** = parse + display + edit
- **Display** = parse + display only
- **None** = not implemented

**Studio configurability:**
- **STUDIO-LIVE** = Can be changed at runtime via ZMK Studio without reflashing
- **FIRMWARE-ONLY** = Requires firmware rebuild (`.keymap`, `.conf`, or devicetree changes)
- **STUDIO-PLANNED** = ZMK Studio support planned but not yet implemented

---

## Behaviors (Key Actions)

ZMK has 31 distinct behaviors. The TOTEM configurator supports assigning all STUDIO-LIVE behaviors.

### Core Key Behaviors

| Feature | ZMK Behavior | Studio | Status | Notes |
|---------|-------------|--------|--------|-------|
| Key Press | `&kp` | LIVE | Full | 300+ keycodes with aliases: letters, numbers, F1-F24, symbols, navigation, media, consumer, international, language, input assist |
| Hold-Tap | `&ht` | LIVE (assign) / FW (create) | Full | Custom `hml`/`hmr` flavors; BehaviorEditor supports all params (flavor, tapping-term, quick-tap, require-prior-idle, retro-tap, hold-trigger-key-positions, hold-trigger-on-release) |
| Mod-Tap | `&mt` | LIVE | Full | Pre-defined hold-tap: modifier on hold, keycode on tap. Default flavor: hold-preferred |
| Layer-Tap (TOTEM) | `&lt_th` | LIVE | Full | Custom TOTEM thumb layer-tap |
| Layer-Tap (generic) | `&lt` | LIVE | Full | Pre-defined hold-tap: layer on hold, keycode on tap. Default flavor: tap-preferred |
| Key Toggle | `&kt` | LIVE | Full | Toggles key press state (press if unpressed, release if pressed). In action picker with keycode grid |
| Sticky Key | `&sk` | LIVE | Full | One-shot modifier. Config: release-after-ms (1000), quick-release, lazy, ignore-modifiers |
| Sticky Layer | `&sl` | LIVE | Full | One-shot layer. In action picker with layer selector |
| Transparent | `&trans` | LIVE | Full | Pass-through to next active layer |
| None | `&none` | LIVE | Full | Block/swallow key events |

### Layer Behaviors

| Feature | ZMK Behavior | Studio | Status | Notes |
|---------|-------------|--------|--------|-------|
| Momentary Layer | `&mo` | LIVE | Full | Enable layer while held |
| Layer Toggle | `&tog` | LIVE | Full | Toggle layer on/off. Supports `toggle-mode`: on/off |
| To Layer | `&to` | LIVE | Full | Enable target layer, disable all others except default. In action picker with layer selector |
| Conditional Layer | `&conditional_layer` | PLANNED | Display | Auto-activate layer when all source layers active. Parsed only |

### Advanced Behaviors

| Feature | ZMK Behavior | Studio | Status | Notes |
|---------|-------------|--------|--------|-------|
| Caps Word | `&caps_word` | LIVE | Full | Auto-deactivates on non-continue-list key. Config: continue-list, mods |
| Key Repeat | `&key_repeat` | LIVE | Full | Sends last keycode again. Config: usage-pages (add HID_USAGE_CONSUMER for media) |
| Mod-Morph | `&mod_morph` | LIVE (assign) / FW (create) | Display | Different behavior when modifier held. Config: mods (bitmask), keep-mods, bindings. BehaviorEditor shows read-only |
| Tap Dance | `&td` | LIVE (assign) / PLANNED (create) | Full | Different behavior per tap count. Config: tapping-term-ms (200), bindings list. BehaviorEditor: tapping-term editable, bindings shown |
| Macro | `&macro` | LIVE (assign) / PLANNED (create) | Display | Execute behavior sequence. Controls: macro_tap/press/release/pause_for_release. Timing: wait-ms (15), tap-ms (30). Supports 0/1/2 params. BehaviorEditor shows timing, bindings read-only |
| Grave Escape | `&gresc` | LIVE | Full | Built-in mod-morph: Esc normally, \` with Shift/GUI. In action picker (no-param) |
| Sensor Rotation | `&inc_dec_kp` | N/A | None | Encoder CW/CCW bindings. Standard and variable variants. Used in `sensor-bindings` |

### System Behaviors

| Feature | ZMK Behavior | Studio | Status | Notes |
|---------|-------------|--------|--------|-------|
| Bootloader | `&bootloader` | LIVE | Full | Reset into bootloader for flashing. Split: affects only the half where bound |
| System Reset | `&sys_reset` | LIVE | Full | Soft-reset running firmware. Split: affects only the half where bound |
| Soft Off | `&soft_off` | LIVE | Full | Power down keyboard. In action picker (no-param). Config: hold-time-ms, split-peripheral-off-on-press. Requires `CONFIG_ZMK_PM_SOFT_OFF=y` |
| External Power | `&ext_power` | LIVE | Full | EP_ON, EP_OFF, EP_TOG. Controls VCC to peripherals. Global (both halves). Persisted to flash |
| ZMK Studio Unlock | `&studio_unlock` | LIVE | Full | Grant Studio permission to modify settings. Auto-relocks on inactivity/disconnect |

### Connectivity Behaviors

| Feature | ZMK Behavior | Studio | Status | Notes |
|---------|-------------|--------|--------|-------|
| Bluetooth Select | `&bt BT_SEL n` | LIVE | Full | Select profile by 0-based index (0-4) |
| Bluetooth Next | `&bt BT_NXT` | LIVE | Full | Next profile (wraps around) |
| Bluetooth Previous | `&bt BT_PRV` | LIVE | Full | Previous profile (wraps around) |
| Bluetooth Clear | `&bt BT_CLR` | LIVE | Full | Clear current profile bond |
| Bluetooth Clear All | `&bt BT_CLR_ALL` | LIVE | Full | Clear all profile bonds |
| Bluetooth Disconnect | `&bt BT_DISC n` | LIVE | Full | Disconnect specific profile by index. Profile selector (0-4) |
| Output Toggle | `&out OUT_TOG` | LIVE | Full | Toggle USB/BLE. Persisted to flash |
| Output USB | `&out OUT_USB` | LIVE | Full | Force USB output |
| Output BLE | `&out OUT_BLE` | LIVE | Full | Force BLE output |

### Mouse Behaviors

Requires `CONFIG_ZMK_POINTING=y`.

| Feature | ZMK Behavior | Studio | Status | Notes |
|---------|-------------|--------|--------|-------|
| Mouse Move | `&mmv` | LIVE | Full | MOVE_UP/DOWN/LEFT/RIGHT. Config: time-to-max (300ms), accel exponent (1), max velocity (600) |
| Mouse Scroll | `&msc` | LIVE | Full | SCRL_UP/DOWN/LEFT/RIGHT. Config: time-to-max (300ms), accel exponent (0), max velocity (10) |
| Mouse Button | `&mkp` | LIVE | Full | MB1/LCLK, MB2/RCLK, MB3/MCLK, MB4 (back), MB5 (forward) |

### Lighting Behaviors

| Feature | ZMK Behavior | Studio | Status | Notes |
|---------|-------------|--------|--------|-------|
| RGB Underglow | `&rgb_ug` | LIVE | Display | RGB_ON/OFF/TOG, HUI/HUD, SAI/SAD, BRI/BRD, SPI/SPD, EFF/EFR, RGB_COLOR_HSB(h,s,b). Persisted to flash. Parsed only |
| Backlight | `&bl` | LIVE | Display | BL_ON/OFF/TOG, INC/DEC, CYCLE, SET. Persisted to flash. Parsed only |

---

## Keymap Features

### Combos (FIRMWARE-ONLY, STUDIO-PLANNED)

| Feature | Status | Notes |
|---------|--------|-------|
| Combo definition | Full | Name, positions, binding, timeout, layers |
| Position picker | Full | Click keys on keyboard to set positions |
| Binding picker | Full | Full BindingPicker integration |
| Timeout (ms) | Full | Editable numeric field (default 50ms) |
| Layer filter | Full | Multi-select layer checkboxes |
| Add/delete/duplicate | Full | Context menu + bottom button |
| `require-prior-idle-ms` | Full | Checkbox + number input in ComboEditor (default 150ms) |
| `slow-release` | Full | Checkbox toggle in ComboEditor |

Max simultaneous: `CONFIG_ZMK_COMBO_MAX_PRESSED_COMBOS` (default 4).

### Conditional Layers (FIRMWARE-ONLY, STUDIO-PLANNED)

| Feature | Status | Notes |
|---------|--------|-------|
| if-layers / then-layer | Display | Parsed from keymap, not editable |
| Chaining | None | One conditional can trigger another's conditions |

Classic use case: tri-layer (activate layer 3 when both 1 and 2 active).

### Layers (STUDIO-LIVE for bindings/rename; FIRMWARE-ONLY for structure)

| Feature | Status | Notes |
|---------|--------|-------|
| Layer display | Full | Horizontal tab strip with layer names |
| Layer switching | Full | Click tabs to view different layers |
| Add layer | Full | "+" button in tab strip |
| Rename layer | Full | Context menu / double-click on layer tab |
| Delete layer | Full | Context menu on layer tab |
| Duplicate layer | Full | Context menu on layer tab |
| Layer reordering | None | Not implemented (drag-and-drop) |
| Sensor bindings per layer | None | `sensor-bindings` not parsed or shown |

Note: Studio cannot add layers beyond those defined in devicetree.

### Keycodes

| Category | Status | Notes |
|----------|--------|-------|
| Letters (A-Z) | Full | Dynamic regex matching |
| Numbers (0-9) | Full | N0-N9 + NUMBER_0-NUMBER_9 aliases |
| Function keys (F1-F24) | Full | Dynamic regex matching |
| Modifiers (Shift/Ctrl/Alt/Gui) | Full | Left/right variants + all aliases (LWIN/LCMD/LMETA etc.) |
| Modified keys | Full | Modifier functions: LS(), RS(), LC(), RC(), LA(), RA(), LG(), RG() and combinations |
| Navigation (arrows, Home, End, PgUp/Dn) | Full | All short and long form aliases |
| Editing (Backspace, Delete, Tab, Enter, Esc, Space, Insert) | Full | MDI nerd font icons |
| Symbols (30+ keys) | Full | All standard US layout symbols + non-US variants (NUBS, NUHS) |
| Locks (Caps, Scroll, Num) | Full | Including LOCKING_* variants |
| Numpad keys | Full | KP_N0-N9, operations, parentheses, clear |
| Consumer: media playback | Full | Play, pause, stop, next, prev, FF, RW, record, eject, shuffle, repeat, slow, captions, snapshot |
| Consumer: volume/sound | Full | Vol up/down, mute, bass boost, alt audio inc |
| Consumer: brightness | Full | Up/down, min, max, auto, backlight toggle, aspect, PiP |
| Consumer: power & lock | Full | Power, sleep, reset, logoff, lock, screensaver, coffee/screen lock |
| Consumer: menu controls | Full | Menu nav (up/down/left/right/pick/select/escape), inc/dec, color buttons (R/G/B/Y), channel, data on screen |
| Consumer: media source | Full | TV, cable, DVD, CD, VCR, guide, computer, WWW, games, phone, messages, satellite, tape, tuner, mode step |
| Application control | Full | Home, back, fwd, refresh, stop, search, bookmarks, zoom, scroll, new, open, save, close, cut/copy/paste/undo/redo, edit, properties, view toggle, insert, delete, reply, forward mail, send, goto, desktop show all, next keyboard layout, voice command, quit, help |
| Application launch | Full | Calc, files, WWW, mail, music, movies, images, docs, word, sheet, presentation, graphics editor, text editor, IM, chat, contacts, calendar, news, database, voicemail, finance, task manager, journal, control panel, help, spell, screen saver, keyboard layout, tips, OEM features, next/prev/select task, my computer |
| Input assist | Full | Next/prev, next/prev group, accept, cancel |
| International (Int1-Int9) | Full | Including named variants (Ro, Kana/KatakanaHiragana, Yen, Henkan, Muhenkan) |
| Language (Lang1-Lang9) | Full | Including named variants (Hangeul, Hanja, Katakana, Hiragana, ZenkakuHankaku) |
| Editing shortcuts | Full | K_UNDO, K_CUT, K_COPY, K_PASTE, K_REDO, K_AGAIN, K_BACK, K_FORWARD |
| System keys | Full | SYSREQ, ALT_ERASE, ATTENTION, K_CANCEL, K_EDIT, CRSEL, EXSEL, PRIOR, SEPARATOR, OUT, OPER |
| Context menu / App | Full | K_APP, K_CONTEXT_MENU, K_CMENU, K_APPLICATION, K_SELECT, K_EXEC, GLOBE, PRINTSCREEN, PAUSE_BREAK |

---

## Configuration (Kconfig / Devicetree)

These require firmware rebuild, not configurable via ZMK Studio.

### Hold-Tap Config

| Parameter | Status | Notes |
|-----------|--------|-------|
| `tapping-term-ms` | Full | BehaviorEditor numeric field. Default 200ms |
| `quick-tap-ms` | Full | BehaviorEditor numeric field. Default -1 (disabled) |
| `require-prior-idle-ms` | Full | BehaviorEditor numeric field. Default -1 (disabled) |
| `flavor` | Full | BehaviorEditor dropdown: balanced, hold-preferred, tap-preferred, tap-unless-interrupted |
| `retro-tap` | Full | BehaviorEditor checkbox |
| `hold-trigger-key-positions` | Full | BehaviorEditor text field (positional hold-tap) |
| `hold-trigger-on-release` | Full | BehaviorEditor checkbox |
| `hold-while-undecided` | None | Immediately activates hold, reverts if tapped |
| `hold-while-undecided-linger` | None | Keep hold active briefly after tap decision |

Max simultaneous hold-taps: 10 (configurable).

### Sticky Key Config

| Parameter | Status | Notes |
|-----------|--------|-------|
| `release-after-ms` | None | Default 1000ms. Auto-release timeout |
| `quick-release` | None | Release on next key press (not release) |
| `lazy` | None | Activate only right before next key press |
| `ignore-modifiers` | None | Default true. Allow chaining sticky mods |

Max simultaneous sticky keys: 10 (configurable).

### Caps Word Config

| Parameter | Status | Notes |
|-----------|--------|-------|
| `continue-list` | None | Default: UNDERSCORE, BACKSPACE, DELETE + alphanumerics |
| `mods` | None | Default: MOD_LSFT. Modifiers applied to alpha keys |

### Macro Config

| Parameter | Status | Notes |
|-----------|--------|-------|
| `wait-ms` | Display | Default 15ms. Delay between behaviors. BehaviorEditor shows |
| `tap-ms` | Display | Default 30ms. Press-to-release duration. BehaviorEditor shows |
| `bindings` | Display | Sequence of macro_tap/press/release + behaviors. Read-only |
| Parameterized macros | None | 0/1/2 param variants with macro_param forwarding |

Queue size: `CONFIG_ZMK_BEHAVIORS_QUEUE_SIZE` (default 64).

### Tap Dance Config

| Parameter | Status | Notes |
|-----------|--------|-------|
| `tapping-term-ms` | Full | BehaviorEditor numeric field. Default 200ms |
| `bindings` | Display | Ordered list shown in BehaviorEditor (read-only) |

### Combo Config

| Parameter | Status | Notes |
|-----------|--------|-------|
| `timeout-ms` | Full | Default 50ms |
| `require-prior-idle-ms` | Full | Default -1 (disabled). Checkbox + ms input in ComboEditor |
| `slow-release` | Full | Checkbox toggle in ComboEditor |
| `layers` | Full | Multi-select in ComboEditor |

### Mod-Morph Config

| Parameter | Status | Notes |
|-----------|--------|-------|
| `mods` | Display | Bitmask: MOD_LSFT, MOD_RSFT, MOD_LCTL, MOD_RCTL, MOD_LALT, MOD_RALT, MOD_LGUI, MOD_RGUI |
| `keep-mods` | None | Which modifiers to pass through with morphed keycode |
| `bindings` | Display | Two behaviors: normal and morphed. Read-only in BehaviorEditor |

### Debouncing Config

| Parameter | Status | Notes |
|-----------|--------|-------|
| `CONFIG_ZMK_KSCAN_DEBOUNCE_PRESS_MS` | None | Default 5ms. Currently set to 1ms in totem.conf |
| `CONFIG_ZMK_KSCAN_DEBOUNCE_RELEASE_MS` | None | Default 5ms. Currently set to 5ms in totem.conf |
| Per-driver `debounce-scan-period-ms` | None | Default 1ms. Devicetree only |

---

## Hardware Features

### Encoders / Sensors (FIRMWARE-ONLY, NOT Studio-compatible)

| Feature | Status | Notes |
|---------|--------|-------|
| Encoder rotation bindings | None | `sensor-bindings` not parsed from keymap. Uses `&inc_dec_kp` |
| `triggers-per-rotation` | None | Not configurable |
| EC11 encoder support | None | No UI for encoder config |
| Push button | N/A | Part of key matrix, handled like normal key |

Note: Encoder rotation bindings CANNOT be assigned via ZMK Studio.

### Displays (FIRMWARE-ONLY, "proof of concept")

| Feature | Status | Notes |
|---------|--------|-------|
| Display enable | None | `CONFIG_ZMK_DISPLAY=y`. Supports SSD1306 OLED, IL0323 ePaper |
| Display blank on idle | None | `CONFIG_ZMK_DISPLAY_BLANK_ON_IDLE` (default y for SSD1306) |
| Display invert | None | `CONFIG_ZMK_DISPLAY_INVERT` |
| Widget: layer status | None | `CONFIG_ZMK_WIDGET_LAYER_STATUS` (default y) |
| Widget: battery | None | `CONFIG_ZMK_WIDGET_BATTERY_STATUS` (default y) |
| Widget: output status | None | `CONFIG_ZMK_WIDGET_OUTPUT_STATUS` (default y) |
| Widget: WPM | None | `CONFIG_ZMK_WIDGET_WPM_STATUS` (default n) |
| Custom status screen | None | `CONFIG_ZMK_DISPLAY_STATUS_SCREEN_CUSTOM` |

### Pointing Devices (FIRMWARE-ONLY)

Requires `CONFIG_ZMK_POINTING=y` (enabled in totem.conf).

| Feature | Status | Notes |
|---------|--------|-------|
| Mouse emulation keys | Full | `&mmv`, `&msc`, `&mkp` behaviors fully supported |
| Mouse config (move speed) | Full | MouseConfigEditor sidebar tab with speed, time-to-max, accel fields |
| Mouse config (scroll speed) | Full | Same editor, scroll section |
| Smooth scrolling | None | `CONFIG_ZMK_SMOOTH_SCROLLING` (HID Resolution Multipliers) |
| Trackball/trackpad | None | Hardware-specific (e.g., Cirque Pinnacle). Requires SPI/I2C drivers |

### Input Processors (FIRMWARE-ONLY)

Modify events from pointing devices and mouse emulation. Defined in devicetree.

| Processor | Status | Notes |
|-----------|--------|-------|
| `&zip_xy_scaler` | None | Scale X/Y movement (multiplier/divisor) |
| `&zip_scroll_scaler` | None | Scale scroll values |
| `&zip_xy_transform` | None | Invert or swap X/Y axes |
| `&zip_scroll_transform` | None | Invert or swap scroll axes |
| `&zip_xy_to_scroll_mapper` | None | Convert pointer movement to scroll |
| `&zip_xy_swap_mapper` | None | Exchange X and Y values |
| `&zip_temp_layer` | None | Enable layer temporarily during pointer use (with timeout) |
| `&zip_button_behaviors` | None | Activate behaviors on mouse button presses |

### Power Management (FIRMWARE-ONLY)

| Feature | Status | Notes |
|---------|--------|-------|
| Idle timeout | None | `CONFIG_ZMK_IDLE_TIMEOUT` (default 30s, totem.conf: 30s) |
| Deep sleep enable | None | `CONFIG_ZMK_SLEEP` (enabled in totem.conf) |
| Deep sleep timeout | None | `CONFIG_ZMK_IDLE_SLEEP_TIMEOUT` (default 15min, totem.conf: 15min) |
| Soft off via keymap | Display | `&soft_off` behavior parsed. Config: hold-time-ms |
| External power control | Full | `&ext_power` EP_ON/OFF/TOG. Persisted to flash |

### Battery

| Feature | Status | Notes |
|---------|--------|-------|
| Battery level reading | Full | Via BLE GATT Battery Service (0x180F) |
| Split keyboard battery | Full | Reads both halves via sysfs or D-Bus GATT. Requires `CONFIG_ZMK_SPLIT_BLE_CENTRAL_BATTERY_LEVEL_FETCHING=y` + `_PROXY=y` (both set in totem.conf) |
| Battery report interval | None | `CONFIG_ZMK_BATTERY_REPORT_INTERVAL` (default 60s). Kconfig only |
| macOS sleep workaround | None | `CONFIG_BT_BAS=n` prevents BLE battery packets from waking Mac |

### RGB / Backlight

| Feature | Status | Notes |
|---------|--------|-------|
| RGB underglow control | Display | `&rgb_ug` behavior parsed, not editable |
| RGB effects | None | Solid, breathe, spectrum, swirl (4 built-in). Kconfig only |
| RGB configuration | None | Hue/sat/brightness steps and ranges, speed, auto-off. Kconfig only |
| RGB LED type | None | WS2812/APA102/LPD880x. Devicetree `chain-length` |
| Backlight control | Display | `&bl` behavior parsed, not editable |
| Backlight configuration | None | Brightness step/start, auto-off. Kconfig only |

---

## ZMK Studio (Live Editing Protocol)

### Currently Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| USB serial connection | Full | Auto-detect ZMK/TOTEM/nRF devices via USB VID/PID |
| BLE GATT connection | Full | Via btleplug. Scan for Studio Service UUID |
| Device discovery | Full | List USB + BLE devices |
| Get device info | Full | Name, serial number |
| Lock/unlock device | Full | Studio unlock behavior. Auto-relocks on idle/disconnect |
| Get keymap (live) | Full | Read all layers and bindings from device |
| Set layer binding | Full | Write individual key bindings to device |
| Rename layer | Full | Set layer display-name (max `CONFIG_ZMK_KEYMAP_LAYER_NAME_MAX_LEN`, default 20) |
| Check unsaved changes | Full | Query device dirty state |
| Save changes | Full | Persist to flash |
| Discard changes | Full | Revert to saved state |
| Get battery level | Full | BLE Battery Service (sysfs > D-Bus GATT > btleplug fallback) |
| List behaviors | Full | Get behavior ID list from device |
| Get physical layout | None | Device physical layout info not queried |

### Planned by ZMK (not yet in firmware)

| Feature | Status | Notes |
|---------|--------|-------|
| Basic behavior config | None | Hold-tap timing, sticky key timing via Studio |
| Tap dance editing | None | Define tap sequences via Studio |
| Macro editing | None | Edit macro steps via Studio |
| Combo editing (live) | None | Create/edit combos via Studio protocol |
| Conditional layer setup | None | Configure conditional layers via Studio |
| Host locale selection | None | Per-host keyboard locale |
| Keymap import/export | None | Transfer keymap between devices |

### Important Studio Caveats

- Once Studio manages keymap, `.keymap` file changes are ignored unless "Restore Stock Settings"
- Studio cannot add layers beyond those defined in devicetree
- Studio cannot define entirely new behaviors (only assign existing ones)
- Encoder rotation bindings cannot be set via Studio
- USB access may require Linux group membership (dialout/plugdev)
- `ZMK_BEHAVIORS_KEEP_ALL` snippet includes all behaviors for Studio use

---

## Build & Firmware

| Feature | Status | Notes |
|---------|--------|-------|
| Keymap file parsing | Full | `parser.rs` handles full `.keymap` devicetree syntax |
| Keymap file generation | Full | `serializer.rs` writes back modified keymap |
| Config file parsing | Full | `.conf` key-value pairs |
| Build triggering | Full | `west build` via BuildConsole |
| Build output display | Full | Streaming build log |
| Firmware flashing | None | UF2 file generated but no auto-flash |
| Shield/board selection | None | Hardcoded to TOTEM |

---

## UI Features

| Feature | Status | Notes |
|---------|--------|-------|
| Visual keyboard layout | Full | SVG rendering with per-action colors (Catppuccin Mocha palette) |
| Key binding editor (click) | Full | BindingPicker modal with categorized keycode browser |
| Key context menu | Full | Copy, paste, set transparent/none |
| Combo overlay on keyboard | Full | Visual highlight of combo positions + labels |
| Combo editor panel | Full | Sidebar tab with accordion-style inline editing |
| Behavior editor panel | Full | Sidebar tab with hold-tap params, macro timing |
| Layer tab strip | Full | Horizontal tabs above keyboard with rename/delete/duplicate |
| Connection status | Full | Status bar badge with device info |
| Battery display | Full | Per-half battery bars (L/R) with color coding |
| Device monitor | Full | Connection panel with scan, connect, lock/unlock, battery |
| Build console | Full | Collapsible bottom panel with streaming build output |
| Dark theme | Full | Catppuccin Mocha palette |
| Nerd font icons | Full | MDI 5-digit codepoints, LilexNerdFontMono bundled locally |
| Undo (Ctrl+Z) | Full | 50-step undo history |

---

## Bluetooth Configuration (FIRMWARE-ONLY)

| Feature | Status | Notes |
|---------|--------|-------|
| Profile count | None | Default 5. `CONFIG_BT_MAX_PAIRED` (totem.conf: 5) |
| Max connections | None | `CONFIG_BT_MAX_CONN` (totem.conf: 6) |
| TX power | None | `CONFIG_BT_CTLR_TX_PWR_PLUS_8` (enabled in totem.conf) |
| Passkey pairing | None | `CONFIG_ZMK_BLE_PASSKEY_ENTRY` (default n) |
| Experimental security | None | `CONFIG_ZMK_BLE_EXPERIMENTAL_SEC` (default n) |
| Experimental connection | None | `CONFIG_ZMK_BLE_EXPERIMENTAL_CONN` (enabled in totem.conf) |
| Device appearance | None | `CONFIG_BT_DEVICE_APPEARANCE` (default 961) |

---

## USB Configuration (FIRMWARE-ONLY)

| Feature | Status | Notes |
|---------|--------|-------|
| USB boot protocol | None | `CONFIG_ZMK_USB_BOOT` (enabled in totem.conf). For BIOS/UEFI |
| VID/PID | None | `CONFIG_USB_DEVICE_VID`/`PID`. Defaults: 0x1D50/0x615E |

---

## HID Configuration (FIRMWARE-ONLY)

| Feature | Status | Notes |
|---------|--------|-------|
| N-Key Rollover | None | `CONFIG_ZMK_HID_REPORT_TYPE_NKRO`. May not work with some BIOS |
| Extended NKRO | None | `CONFIG_ZMK_HID_KEYBOARD_NKRO_EXTENDED_REPORT` (F13-F24, INTL1-8) |
| LED indicators | None | `CONFIG_ZMK_HID_INDICATORS` (caps lock LED etc.) |
| Consumer report size | None | `CONFIG_ZMK_HID_CONSUMER_REPORT_SIZE` (default 6) |
| Separate mod release | None | `CONFIG_ZMK_HID_SEPARATE_MOD_RELEASE_REPORT` |

---

## Split Keyboard (FIRMWARE-ONLY)

| Feature | Status | Notes |
|---------|--------|-------|
| Split enable | N/A | TOTEM is always split |
| Central battery proxy | Full | `CONFIG_ZMK_SPLIT_BLE_CENTRAL_BATTERY_LEVEL_PROXY=y` (in totem.conf) |
| Central battery fetching | Full | `CONFIG_ZMK_SPLIT_BLE_CENTRAL_BATTERY_LEVEL_FETCHING=y` (in totem.conf) |
| Wired split (UART) | None | Alternative to BLE split. Half-duplex planned |

---

## Priority Implementation Targets

### High Priority (commonly used features missing editing)
- [ ] Mod-morph editor (edit normal/shifted bindings + mods bitmask + keep-mods)
- [ ] Macro editor (visual step builder: tap/press/release, timing, parameter forwarding)
- [x] ~~Generic `&lt` in action picker~~
- [x] ~~`&sl` (sticky layer) in action picker~~
- [x] ~~`&to` (to layer) in action picker~~
- [x] ~~`&soft_off` in action picker~~
- [x] ~~`&gresc` (grave escape) in action picker~~
- [x] ~~`&kt` (key toggle) in action picker~~
- [x] ~~`&bt BT_NXT` / `BT_PRV` / `BT_DISC` in action picker~~
- [x] ~~Combo `require-prior-idle-ms` UI control~~
- [x] ~~Combo `slow-release` UI control~~
- [x] ~~Tap dance parsing + BehaviorEditor (tapping-term editable)~~
- [x] ~~Mouse config editor~~

### Medium Priority (power user features)
- [ ] Layer reordering (drag-and-drop)
- [ ] RGB underglow control editor (all commands + HSB color picker)
- [ ] Backlight control editor
- [ ] Combo editing via ZMK Studio protocol (when firmware supports it)
- [ ] Hold-tap `hold-while-undecided` / `hold-while-undecided-linger` options
- [ ] Sticky key timing config (release-after-ms, quick-release, lazy, ignore-modifiers)
- [ ] Conditional layer editor

### Low Priority (hardware/advanced config)
- [ ] Input processor configuration (scalers, transforms, temp layer)
- [ ] Display widget configuration
- [ ] Firmware flashing (UF2 auto-flash)
- [ ] Multi-board/shield support
- [ ] Physical layout querying from device
- [ ] Caps word continue-list/mods configuration
- [ ] Debouncing configuration UI
- [ ] Bluetooth settings UI (profiles, TX power, security)
- [ ] HID settings UI (NKRO, report type)
- [ ] Power management UI (idle/sleep timeouts)
