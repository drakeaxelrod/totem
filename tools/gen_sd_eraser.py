#!/usr/bin/env python3
"""Generate a UF2 file that erases the SoftDevice region (0x1000-0x27000).

Writes 0xFF bytes to the entire SoftDevice flash region, which makes the
Adafruit bootloader's is_sd_existed() return false. After erasing, the
bootloader expects the application at MBR_SIZE (0x1000) instead of 0x27000.
"""

import struct
import sys

UF2_MAGIC_START0 = 0x0A324655  # "UF2\n"
UF2_MAGIC_START1 = 0x9E5D5157
UF2_MAGIC_END = 0x0AB16F30
UF2_FLAG_FAMILY_ID = 0x00002000
NRF52840_FAMILY_ID = 0xADA52840

SD_START = 0x1000   # SoftDevice starts right after MBR
SD_END = 0x27000    # SoftDevice ends here (S140 v7.3.0)
BLOCK_SIZE = 256    # UF2 payload per block


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
    # Pad data to 476 bytes
    padded = data + b"\x00" * (476 - len(data))
    footer = struct.pack("<I", UF2_MAGIC_END)
    return header + padded + footer


def main():
    output = sys.argv[1] if len(sys.argv) > 1 else "sd_eraser.uf2"

    region_size = SD_END - SD_START
    num_blocks = (region_size + BLOCK_SIZE - 1) // BLOCK_SIZE
    erased_data = b"\xff" * BLOCK_SIZE

    blocks = []
    for i in range(num_blocks):
        addr = SD_START + i * BLOCK_SIZE
        remaining = min(BLOCK_SIZE, SD_END - addr)
        blocks.append(make_uf2_block(addr, b"\xff" * remaining, i, num_blocks))

    with open(output, "wb") as f:
        for block in blocks:
            f.write(block)

    print(f"Generated {output}")
    print(f"  Region: 0x{SD_START:05X} - 0x{SD_END:05X} ({region_size} bytes)")
    print(f"  Blocks: {num_blocks}")
    print(f"  Size: {num_blocks * 512} bytes")


if __name__ == "__main__":
    main()
