# TOTEM RMK Firmware

RMK firmware for the [TOTEM](https://github.com/GEIGEIGEIST/TOTEM) 38-key split keyboard with Seeed XIAO nRF52840.

## Prerequisites

1. Install Rust and the ARM target:
   ```shell
   rustup target add thumbv7em-none-eabihf
   ```

2. Install cargo-make:
   ```shell
   cargo install --force cargo-make
   ```

## Building

Build and generate UF2 firmware files:

```shell
cd firmware
cargo make uf2
```

This will generate:
- `totem-left.uf2` - Flash to the left half (central)
- `totem-right.uf2` - Flash to the right half (peripheral)

## Flashing

1. Connect your XIAO nRF52840 via USB
2. Enter bootloader mode by double-tapping the reset button (or shorting RST to GND twice quickly)
3. A USB drive named "XIAO-SENSE" or similar will appear
4. Drag and drop the appropriate .uf2 file onto the USB drive
5. The board will automatically reset and run the new firmware

Flash the left half first, then the right half.

## Default Keymap

The firmware comes with a Colemak-DH layout by default. Modify the `keymap` section in `keyboard.toml` to customize.

### Layers

- **Layer 0 (Base)**: Colemak-DH layout
- **Layer 1 (Nav)**: Navigation + Numpad (hold Space)
- **Layer 2 (Sym)**: Symbols + Media (hold Enter)
- **Layer 3 (Adj)**: Function keys + BT controls

## Pin Mapping

XIAO nRF52840 pins used:

| Function | XIAO Pin | nRF52840 GPIO |
|----------|----------|---------------|
| Row 0    | D0       | P0.02         |
| Row 1    | D1       | P0.03         |
| Row 2    | D2       | P0.28         |
| Row 3    | D3       | P0.29         |
| Col 0/4  | D4       | P0.04         |
| Col 1/3  | D5       | P0.05         |
| Col 2    | D10      | P1.15         |
| Col 3/1  | D9       | P1.14         |
| Col 4/0  | D8       | P1.13         |

## Notes

- The left half is the "central" and handles BLE communication to the host
- The right half is the "peripheral" and communicates with the left half over BLE
- After flashing, disconnect USB to use in wireless mode, or the keyboard will default to USB
