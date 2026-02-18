#!/usr/bin/env python3
"""Generate a UF2 file that erases the ZMK settings/storage partition (0xEC000-0xF4000).

Writes 0xFF bytes to the storage region, clearing all NVS data including
ZMK Studio keymap overrides, BLE bonds, and other saved settings.
"""

import struct
import sys

UF2_MAGIC_START0 = 0x0A324655  # "UF2\n"
UF2_MAGIC_START1 = 0x9E5D5157
UF2_MAGIC_END = 0x0AB16F30
UF2_FLAG_FAMILY_ID = 0x00002000
NRF52840_FAMILY_ID = 0xADA52840

STORAGE_START = 0xEC000  # storage_partition start (xiao_ble default)
STORAGE_END = 0xF4000    # storage_partition end
BLOCK_SIZE = 256         # UF2 payload per block


def make_uf2_block(addr, data, block_no, num_blocks):
    """Create a single 512-byte UF2 block."""
    assert len(data) <= 476
    flags = UF2_FLAG_FAMILY_ID
    header = struct.pack(
        "<IIIIIIII",
        UF2_MAGIC_START0,
        UF2_MAGIC_START1,
        flags,
        addr,
        len(data),
        block_no,
        num_blocks,
        NRF52840_FAMILY_ID,
    )
    padded = data + b"\x00" * (476 - len(data))
    footer = struct.pack("<I", UF2_MAGIC_END)
    return header + padded + footer


def main():
    output = sys.argv[1] if len(sys.argv) > 1 else "storage_eraser.uf2"

    region_size = STORAGE_END - STORAGE_START
    num_blocks = (region_size + BLOCK_SIZE - 1) // BLOCK_SIZE

    blocks = []
    for i in range(num_blocks):
        addr = STORAGE_START + i * BLOCK_SIZE
        remaining = min(BLOCK_SIZE, STORAGE_END - addr)
        blocks.append(make_uf2_block(addr, b"\xff" * remaining, i, num_blocks))

    with open(output, "wb") as f:
        for block in blocks:
            f.write(block)

    print(f"Generated {output}")
    print(f"  Region: 0x{STORAGE_START:05X} - 0x{STORAGE_END:05X} ({region_size} bytes)")
    print(f"  Blocks: {num_blocks}")
    print(f"  Size: {num_blocks * 512} bytes")


if __name__ == "__main__":
    main()
