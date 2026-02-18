{
  description = "TOTEM split keyboard — firmware, config, and tools";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    zmk-nix = {
      url = "github:lilyinstarlight/zmk-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, zmk-nix }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

        # ── ZMK firmware (Nix derivations) ──────────────────────────

        zmk-src = nixpkgs.lib.sourceFilesBySuffices (self + "/zmk") [
          ".board" ".cmake" ".conf" ".defconfig" ".dts" ".dtsi"
          ".json" ".keymap" ".overlay" ".shield" ".yml" "_defconfig"
        ];

        zmk-firmware = zmk-nix.legacyPackages.${system}.buildSplitKeyboard {
          name = "totem-zmk";
          src = zmk-src;
          board = "xiao_ble//zmk";
          shield = "totem_%PART%";
          enableZmkStudio = true;
          zephyrDepsHash = "sha256-4LxcKpDKa93TOhoqvNmjxf1ZeHAFjV8hQYJaT/MjzT0=";
          meta = {
            description = "ZMK firmware for TOTEM split keyboard";
            license = nixpkgs.lib.licenses.mit;
            platforms = nixpkgs.lib.platforms.all;
          };
        };

        zmk-dongle-firmware = zmk-nix.legacyPackages.${system}.buildSplitKeyboard {
          name = "totem-zmk-dongle";
          src = zmk-src;
          board = "xiao_ble//zmk";
          shield = "totem_dongle_%PART%";
          parts = ["central" "left" "right"];
          centralPart = "central";
          enableZmkStudio = true;
          zephyrDepsHash = "sha256-sCIbjeRbmKivNQQB4O/E7Hd/1mwfhhLPQTPWE6vADco=";
          meta = {
            description = "ZMK dongle firmware for TOTEM split keyboard";
            license = nixpkgs.lib.licenses.mit;
            platforms = nixpkgs.lib.platforms.all;
          };
        };

        zmk-settings-reset = zmk-nix.legacyPackages.${system}.buildKeyboard {
          name = "totem-zmk-settings-reset";
          src = zmk-src;
          board = "xiao_ble//zmk";
          shield = "totem_settings_reset";
          zephyrDepsHash = "sha256-sCIbjeRbmKivNQQB4O/E7Hd/1mwfhhLPQTPWE6vADco=";
          meta = {
            description = "ZMK settings reset for TOTEM (boots from 0x1000)";
            license = nixpkgs.lib.licenses.mit;
            platforms = nixpkgs.lib.platforms.all;
          };
        };

        # ── Rust toolchain (for RMK + Tauri) ────────────────────────

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rustfmt" "llvm-tools" ];
          targets = [ "thumbv7em-none-eabihf" ];
        };

        # ── Shell scripts ────────────────────────────────────────────

        rmk-script = pkgs.writeShellScriptBin "rmk" ''
          set -e
          ROOT="$(git rev-parse --show-toplevel)"
          BUILD="$ROOT/build"
          mkdir -p "$BUILD"
          cd "$ROOT/rmk"

          uf2() {
            cargo objcopy --release --bin "$1" -- -O ihex "$BUILD/$2.hex"
            cargo hex-to-uf2 --input-path "$BUILD/$2.hex" --output-path "$BUILD/$2.uf2" --family nrf52840
          }

          if [ "''${1:-}" = "--dongle" ]; then
            echo "=== Dongle mode (3 devices) ==="
            echo "Building dongle (USB receiver)..."
            cargo build --release --bin dongle
            echo "Building left half (peripheral 0)..."
            cargo build --release --bin dongle_peripheral
            echo "Building right half (peripheral 1)..."
            cargo build --release --bin dongle_peripheral2

            echo "Converting to UF2..."
            uf2 dongle totem-dongle
            uf2 dongle_peripheral totem-left
            uf2 dongle_peripheral2 totem-right

            echo ""
            echo "  → build/totem-dongle.uf2  (USB dongle)"
            echo "  → build/totem-left.uf2    (left half)"
            echo "  → build/totem-right.uf2   (right half)"
          else
            echo "=== Normal mode (left=central, right=peripheral) ==="
            echo "Building central (left half)..."
            cargo build --release --bin central
            echo "Building peripheral (right half)..."
            cargo build --release --bin peripheral

            echo "Converting to UF2..."
            uf2 central totem-left
            uf2 peripheral totem-right

            echo ""
            echo "  → build/totem-left.uf2   (central / left half)"
            echo "  → build/totem-right.uf2  (peripheral / right half)"
          fi

          echo ""
          echo "Flash: cp build/totem-*.uf2 /run/media/$USER/XIAO-SENSE/"
        '';

        zmk-script = pkgs.writeShellScriptBin "zmk" ''
          set -e
          ROOT="$(git rev-parse --show-toplevel)"
          BUILD="$ROOT/build"
          mkdir -p "$BUILD"

          # Parse flags
          DONGLE=false RESET=false BOOTLOADER=false
          for arg in "$@"; do
            case "$arg" in
              --dongle) DONGLE=true ;;
              --reset) RESET=true ;;
              --bootloader) BOOTLOADER=true ;;
            esac
          done

          if $BOOTLOADER; then
            echo "=== Downloading Adafruit bootloader for XIAO nRF52840 Sense ==="
            ${pkgs.curl}/bin/curl -fSL -o "$BUILD/xiao-bootloader-update.uf2" \
              "https://github.com/0hotpotman0/BLE_52840_Core/raw/main/bootloader/Seeed_XIAO_nRF52840_Sense/update-Seeed_XIAO_nRF52840_Sense_bootloader-0.6.1_nosd.uf2"
            echo "  → build/xiao-bootloader-update.uf2"
            exit 0
          fi

          if $RESET; then
            echo "=== Building ZMK settings reset ==="
            OUT=$(nix build "$ROOT#zmk-settings-reset" --no-link --print-out-paths)
            install -m 644 "$OUT/zmk.uf2" "$BUILD/totem-zmk-settings-reset.uf2"
            echo "  → build/totem-zmk-settings-reset.uf2"
            echo ""
          fi

          if $DONGLE; then
            echo "=== Building ZMK dongle firmware (3 devices) ==="
            OUT=$(nix build "$ROOT#zmk-dongle" --no-link --print-out-paths)
            install -m 644 "$OUT/zmk_central.uf2" "$BUILD/totem-zmk-dongle.uf2"
            install -m 644 "$OUT/zmk_left.uf2" "$BUILD/totem-zmk-dongle-left.uf2"
            install -m 644 "$OUT/zmk_right.uf2" "$BUILD/totem-zmk-dongle-right.uf2"

            echo "  → build/totem-zmk-dongle.uf2       (USB dongle)"
            echo "  → build/totem-zmk-dongle-left.uf2  (left half)"
            echo "  → build/totem-zmk-dongle-right.uf2 (right half)"
          else
            echo "=== Building ZMK firmware ==="
            OUT=$(nix build "$ROOT#zmk" --no-link --print-out-paths)
            install -m 644 "$OUT/zmk_left.uf2" "$BUILD/totem-zmk-left.uf2"
            install -m 644 "$OUT/zmk_right.uf2" "$BUILD/totem-zmk-right.uf2"

            echo "  → build/totem-zmk-left.uf2  (central / left half)"
            echo "  → build/totem-zmk-right.uf2 (peripheral / right half)"
          fi

          echo ""
          echo "Flash: cp build/totem-zmk-*.uf2 /run/media/$USER/XIAO-SENSE/"
        '';

        sd-eraser-script = pkgs.writeShellScriptBin "sd-eraser" ''
          set -e
          ROOT="$(git rev-parse --show-toplevel)"
          BUILD="$ROOT/build"
          mkdir -p "$BUILD"
          echo "=== Generating SoftDevice eraser ==="
          ${pkgs.python3}/bin/python3 "$ROOT/tools/gen_sd_eraser.py" "$BUILD/sd_eraser.uf2"
          echo "  → build/sd_eraser.uf2"
          echo ""
          echo "Flash this to erase the SoftDevice region (0x1000-0x27000)."
          echo "Required when switching from RMK v0.7+ back to ZMK."
        '';

        studio-script = pkgs.writeShellScriptBin "studio" ''
          echo "Opening ZMK Studio..."
          echo "Connect keyboard via USB first, then unlock in the web UI."
          for browser in chromium google-chrome-stable brave microsoft-edge; do
            if command -v "$browser" &>/dev/null; then
              exec "$browser" --app="https://zmk.studio/"
            fi
          done
          ${pkgs.xdg-utils}/bin/xdg-open "https://zmk.studio/"
        '';

        vial-script = pkgs.writeShellScriptBin "vial" ''
          echo "Launching Vial..."
          exec ${pkgs.vial}/bin/vial "$@"
        '';

        gui-script = pkgs.writeShellScriptBin "gui" ''
          set -e
          cd "$(git rev-parse --show-toplevel)/app"
          if [ ! -d node_modules ]; then
            echo "Installing dependencies..."
            pnpm install
          fi
          WAYLAND_DISPLAY= pnpm tauri dev
        '';
      in
      {
        packages.zmk = zmk-firmware;
        packages.zmk-dongle = zmk-dongle-firmware;
        packages.zmk-settings-reset = zmk-settings-reset;
        packages.zmk-flash = zmk-nix.packages.${system}.flash.override { firmware = zmk-firmware; };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Rust (RMK firmware + Tauri backend)
            rustToolchain
            cargo-make
            cargo-binutils

            # Required for bindgen (nrf-sdc)
            llvmPackages.libclang
            llvmPackages.clang

            # Build tools
            pkg-config

            # Flashing
            probe-rs-tools

            # App (Tauri + Node.js)
            nodejs_22
            pnpm
            gtk3
            webkitgtk_4_1
            libsoup_3
            openssl
            glib
            cairo
            pango
            gdk-pixbuf
            atk
            libappindicator-gtk3
            librsvg
            dbus
            udev

            # Keyboard tools
            vial
            xdg-utils

            # Debugging
            picocom
          ];

          packages = [
            rmk-script
            zmk-script
            sd-eraser-script
            studio-script
            vial-script
            gui-script
          ];

          LIBCLANG_PATH = "${pkgs.llvmPackages.libclang.lib}/lib";
          BINDGEN_EXTRA_CLANG_ARGS = "-isystem ${pkgs.llvmPackages.libclang.lib}/lib/clang/${pkgs.lib.getVersion pkgs.llvmPackages.clang}/include";

          shellHook = ''
            echo "TOTEM keyboard development environment"
            echo ""
            echo "  Build:"
            echo "    rmk              Build RMK firmware (left + right)"
            echo "    rmk --dongle     Build RMK dongle mode (dongle + left + right)"
            echo "    zmk              Build ZMK firmware (left + right)"
            echo "    zmk --dongle     Build ZMK dongle mode (dongle + left + right)"
            echo "    zmk --reset      Build ZMK settings reset"
            echo "    zmk --bootloader Download XIAO nRF52840 bootloader"
            echo "    sd-eraser        Generate SoftDevice eraser UF2"
            echo ""
            echo "  Tools:"
            echo "    gui              Run TOTEM GUI (Tauri dev server)"
            echo "    studio           Open ZMK Studio (web)"
            echo "    vial             Launch Vial GUI"
            echo ""
            echo "  All outputs → build/"
          '';
        };
      }
    );
}
