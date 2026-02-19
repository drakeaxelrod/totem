{
  description = "TOTEM split keyboard — ZMK firmware and config";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    # Zephyr SDK + Python environment for ZMK builds
    zephyr = {
      url = "github:zmkfirmware/zephyr/v3.5.0+zmk-fixes";
      flake = false;
    };
    zephyr-nix = {
      url = "github:urob/zephyr-nix";
      inputs.zephyr.follows = "zephyr";
      # Don't follow nixpkgs — zephyr-nix needs python310 which newer nixpkgs dropped
    };
  };

  outputs = { self, nixpkgs, flake-utils, zephyr-nix, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        zephyr = zephyr-nix.packages.${system};

        # ── Shell script ───────────────────────────────────────────

        totem-script = pkgs.writeShellScriptBin "totem" ''
          set -e
          # Walk up to find the real project root (can't use git rev-parse
          # because West-fetched repos like zmk/ have their own .git)
          ROOT="$PWD"
          while [ ! -f "$ROOT/flake.nix" ] && [ "$ROOT" != "/" ]; do
            ROOT="$(dirname "$ROOT")"
          done
          if [ ! -f "$ROOT/flake.nix" ]; then
            echo "Error: cannot find project root (no flake.nix found)" >&2
            exit 1
          fi
          BUILD="$ROOT/build"
          cd "$ROOT"

          # Initialize West workspace if needed
          if [ ! -d .west ]; then
            echo "=== Initializing West workspace ==="
            west init -l config
            west update
            west zephyr-export
          fi

          export ZEPHYR_BASE="$ROOT/zephyr"
          export CMAKE_PREFIX_PATH="$ROOT/zephyr/share/zephyr-package/cmake''${CMAKE_PREFIX_PATH:+:$CMAKE_PREFIX_PATH}"

          # Build helper
          zmk_build() {
            local shield="$1" name="$2"
            echo "  Building $shield..."
            west build -s zmk/app -d .build/"$name" -b xiao_ble//zmk -- \
              -DSHIELD="$shield" -DZMK_CONFIG="$ROOT/config"
          }

          case "''${1:-build}" in
            build)
              mkdir -p "$BUILD"

              echo "=== Building ZMK firmware ==="
              zmk_build totem_left left
              zmk_build totem_right right
              zmk_build totem_settings_reset settings_reset

              install -m 644 .build/left/zephyr/zmk.uf2 "$BUILD/totem-zmk-left.uf2"
              install -m 644 .build/right/zephyr/zmk.uf2 "$BUILD/totem-zmk-right.uf2"
              install -m 644 .build/settings_reset/zephyr/zmk.uf2 "$BUILD/totem-zmk-settings-reset.uf2"

              echo "  → build/totem-zmk-left.uf2            (central / left half)"
              echo "  → build/totem-zmk-right.uf2           (peripheral / right half)"
              echo "  → build/totem-zmk-settings-reset.uf2  (bond/settings reset)"
              echo ""
              echo "Flash: cp build/totem-zmk-*.uf2 /run/media/$USER/XIAO-SENSE/"
              ;;

            update)
              echo "=== Updating West workspace ==="
              west update
              ;;

            bootloader)
              mkdir -p "$BUILD"
              echo "=== Downloading Adafruit bootloader for XIAO nRF52840 Sense ==="
              ${pkgs.curl}/bin/curl -fSL -o "$BUILD/xiao-bootloader-update.uf2" \
                "https://github.com/0hotpotman0/BLE_52840_Core/raw/main/bootloader/Seeed_XIAO_nRF52840_Sense/update-Seeed_XIAO_nRF52840_Sense_bootloader-0.6.1_nosd.uf2"
              echo "  → build/xiao-bootloader-update.uf2"
              ;;

            *)
              echo "TOTEM keyboard tools"
              echo ""
              echo "Usage: totem <command>"
              echo ""
              echo "  totem              Build ZMK firmware (left + right + reset)"
              echo "  totem bootloader   Download XIAO nRF52840 bootloader"
              echo "  totem update       Update ZMK source (west update)"
              echo ""
              echo "  All build outputs → build/"
              ;;
          esac
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Zephyr / ZMK build tools
            zephyr.pythonEnv
            (zephyr.sdk.override { targets = [ "arm-zephyr-eabi" ]; })
            cmake
            dtc
            ninja
            protobuf  # Required for ZMK Studio

            # Tools
            picocom
          ];

          packages = [ totem-script ];

          env = {
            PYTHONPATH = "${zephyr.pythonEnv}/${zephyr.pythonEnv.sitePackages}";
          };

          shellHook = ''
            echo "TOTEM keyboard development environment"
            echo ""
            echo "  totem              Build ZMK firmware (left + right + reset)"
            echo "  totem bootloader   Download XIAO nRF52840 bootloader"
            echo "  totem update       Update ZMK source (west update)"
            echo ""
            echo "  All build outputs → build/"
          '';
        };
      }
    );
}
