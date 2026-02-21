# TOTEM split keyboard — ZMK firmware build commands

root    := justfile_directory()
zmk_app := root / "zmk/app"
bdir    := root / ".build"
out     := root / "build"
config  := root / "config"

# List available commands
default:
    @just --list

# Initialize west workspace (first time only)
init:
    west init -l config
    west update
    west zephyr-export

# Update west modules (ZMK, Zephyr, etc.)
update:
    west update

# Build all firmware targets
build: build-dongle build-left build-right build-reset
    mkdir -p {{out}}
    install -m 644 {{bdir}}/dongle/zephyr/zmk.uf2         {{out}}/totem-zmk-dongle.uf2
    install -m 644 {{bdir}}/left/zephyr/zmk.uf2           {{out}}/totem-zmk-left.uf2
    install -m 644 {{bdir}}/right/zephyr/zmk.uf2          {{out}}/totem-zmk-right.uf2
    install -m 644 {{bdir}}/reset/zephyr/zmk.uf2 {{out}}/totem-zmk-reset.uf2
    @echo ""
    @echo "Firmware ready:"
    @ls -1 {{out}}/totem-zmk-*.uf2

# Build dongle (USB central) firmware
build-dongle:
    west build -s {{zmk_app}} -d {{bdir}}/dongle -b xiao_ble//zmk -- \
        -DSHIELD=totem_dongle -DZMK_CONFIG={{config}}

# Build left half firmware
build-left:
    west build -s {{zmk_app}} -d {{bdir}}/left -b xiao_ble//zmk -- \
        -DSHIELD=totem_left -DZMK_CONFIG={{config}}

# Build right half firmware
build-right:
    west build -s {{zmk_app}} -d {{bdir}}/right -b xiao_ble//zmk -- \
        -DSHIELD=totem_right -DZMK_CONFIG={{config}}

# Build settings reset firmware
build-reset:
    west build -s {{zmk_app}} -d {{bdir}}/reset -b xiao_ble//zmk -- \
        -DSHIELD=totem_reset -DZMK_CONFIG={{config}}

# Flash a target to plugged-in XIAO (double-tap reset first)
# Usage: just flash dongle | left | right | reset
flash target:
    #!/usr/bin/env bash
    set -euo pipefail
    dev="/dev/disk/by-label/XIAO-SENSE"
    if [ ! -e "$dev" ]; then
        echo "XIAO not found — double-tap reset and try again"
        exit 1
    fi
    mountpoint=$(udisksctl mount -b "$dev" 2>/dev/null | grep -oP 'at \K.*' || true)
    if [ -z "$mountpoint" ]; then
        mountpoint="/run/media/$USER/XIAO-SENSE"
    fi
    cp "{{out}}/totem-zmk-{{target}}.uf2" "$mountpoint/"
    echo "Flashed {{target}}"

# Download XIAO nRF52840 bootloader
bootloader:
    mkdir -p {{out}}
    curl -fSL -o {{out}}/xiao-bootloader-update.uf2 \
        "https://github.com/0hotpotman0/BLE_52840_Core/raw/main/bootloader/Seeed_XIAO_nRF52840_Sense/update-Seeed_XIAO_nRF52840_Sense_bootloader-0.6.1_nosd.uf2"
    @echo "Bootloader saved to {{out}}/xiao-bootloader-update.uf2"

# Generate SVG layer diagrams
gen-svg:
    python tools/gen_svg_layers.py

# Open serial console
serial device="/dev/ttyACM0":
    picocom -b 115200 {{device}}

# Clean build artifacts
clean:
    rm -rf {{bdir}}
    @echo "Cleaned .build/"
