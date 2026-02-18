{
  description = "TOTEM split keyboard - firmware and reference app";

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

        zmk-src = nixpkgs.lib.sourceFilesBySuffices (self + "/zmk") [ ".board" ".cmake" ".conf" ".defconfig" ".dts" ".dtsi" ".json" ".keymap" ".overlay" ".shield" ".yml" "_defconfig" ];

        zmk-firmware = zmk-nix.legacyPackages.${system}.buildSplitKeyboard {
          name = "totem-zmk";
          src = zmk-src;
          board = "xiao_ble//zmk";
          shield = "totem_%PART%";
          zephyrDepsHash = "sha256-4LxcKpDKa93TOhoqvNmjxf1ZeHAFjV8hQYJaT/MjzT0=";
          meta = {
            description = "ZMK firmware for TOTEM split keyboard";
            license = nixpkgs.lib.licenses.mit;
            platforms = nixpkgs.lib.platforms.all;
          };
        };

        zmk-settings-reset = zmk-nix.legacyPackages.${system}.buildKeyboard {
          name = "totem-zmk-settings-reset";
          src = zmk-src;
          board = "xiao_ble//zmk";
          shield = "settings_reset";
          zephyrDepsHash = "sha256-j5bWsbcAkEs0SHL47KkIBBEbaooejXb9V6K1bVieHqc=";
          meta = {
            description = "ZMK settings reset for TOTEM";
            license = nixpkgs.lib.licenses.mit;
            platforms = nixpkgs.lib.platforms.all;
          };
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rustfmt" "llvm-tools" ];
          targets = [ "thumbv7em-none-eabihf" ];
        };

        firmware-script = pkgs.writeShellScriptBin "firmware" ''
          set -e
          ROOT="$(git rev-parse --show-toplevel)"
          BUILD="$ROOT/build"
          mkdir -p "$BUILD"
          cd "$ROOT/firmware"

          uf2() {
            cargo objcopy --release --bin "$1" -- -O ihex "$BUILD/$2.hex"
            cargo hex-to-uf2 --input-path "$BUILD/$2.hex" --output-path "$BUILD/$2.uf2" --family nrf52840
          }

          if [ "''${1:-}" = "--dongle" ]; then
            echo "=== Dongle mode (3 devices) ==="
            echo "Building dongle (USB receiver, use_rust)..."
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
            echo "UF2 files:"
            echo "  build/totem-dongle.uf2  (USB dongle)"
            echo "  build/totem-left.uf2    (left half)"
            echo "  build/totem-right.uf2   (right half)"
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
            echo "UF2 files:"
            echo "  build/totem-left.uf2   (central / left half)"
            echo "  build/totem-right.uf2  (peripheral / right half)"
          fi

          echo ""
          echo "Flash via USB (double-tap reset to enter bootloader):"
          echo "  cp build/totem-*.uf2 /run/media/\$USER/XIAO-SENSE/"
        '';

        zmk-script = pkgs.writeShellScriptBin "zmk" ''
          set -e
          ROOT="$(git rev-parse --show-toplevel)"
          BUILD="$ROOT/build"
          mkdir -p "$BUILD"

          if [ "''${1:-}" = "--bootloader" ]; then
            echo "=== Downloading Adafruit bootloader for XIAO nRF52840 Sense ==="
            ${pkgs.curl}/bin/curl -fSL -o "$BUILD/xiao-bootloader-update.uf2" \
              "https://github.com/0hotpotman0/BLE_52840_Core/raw/main/bootloader/Seeed_XIAO_nRF52840_Sense/update-Seeed_XIAO_nRF52840_Sense_bootloader-0.6.1_nosd.uf2"
            echo ""
            echo "Bootloader update: build/xiao-bootloader-update.uf2"
            echo "Flash via bootloader mode (double-tap reset):"
            echo "  cp build/xiao-bootloader-update.uf2 /run/media/\$USER/XIAO-SENSE/"
            exit 0
          fi

          if [ "''${1:-}" = "--reset" ]; then
            echo "=== Building ZMK settings reset ==="
            nix build "$ROOT#zmk-settings-reset" --out-link "$BUILD/zmk-reset-result"
            install -m 644 "$BUILD/zmk-reset-result/zmk.uf2" "$BUILD/totem-zmk-settings-reset.uf2"
            rm "$BUILD/zmk-reset-result"
            echo ""
            echo "Flash this FIRST to clear stale data, then flash the real firmware:"
            echo "  cp build/totem-zmk-settings-reset.uf2 /run/media/\$USER/XIAO-SENSE/"
            exit 0
          fi

          echo "=== Building ZMK firmware ==="
          nix build "$ROOT#zmk" --out-link "$BUILD/zmk-result"

          install -m 644 "$BUILD/zmk-result/zmk_left.uf2" "$BUILD/totem-zmk-left.uf2"
          install -m 644 "$BUILD/zmk-result/zmk_right.uf2" "$BUILD/totem-zmk-right.uf2"
          rm "$BUILD/zmk-result"

          echo ""
          echo "UF2 files:"
          echo "  build/totem-zmk-left.uf2   (central / left half)"
          echo "  build/totem-zmk-right.uf2  (peripheral / right half)"
          echo ""
          echo "Flash via USB (double-tap reset to enter bootloader):"
          echo "  cp build/totem-zmk-*.uf2 /run/media/\$USER/XIAO-SENSE/"
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
        packages.zmk-settings-reset = zmk-settings-reset;
        packages.zmk-flash = zmk-nix.packages.${system}.flash.override { firmware = zmk-firmware; };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            rustToolchain
            cargo-make
            cargo-binutils

            # Required for bindgen (nrf-sdc)
            llvmPackages.libclang
            llvmPackages.clang

            # Build tools
            pkg-config

            # For flashing
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

            # Debugging
            picocom # Serial console

          ];

          packages = [
            firmware-script
            zmk-script
            gui-script
          ];

          LIBCLANG_PATH = "${pkgs.llvmPackages.libclang.lib}/lib";
          BINDGEN_EXTRA_CLANG_ARGS = "-isystem ${pkgs.llvmPackages.libclang.lib}/lib/clang/${pkgs.lib.getVersion pkgs.llvmPackages.clang}/include";

          shellHook = ''
            echo "TOTEM development environment"
            echo "  firmware           - build RMK normal mode (left=central, right=peripheral)"
            echo "  firmware --dongle  - build RMK dongle mode (dongle + left + right)"
            echo "  zmk                - build ZMK firmware → build/totem-zmk-{left,right}.uf2"
            echo "  zmk --bootloader   - download XIAO nRF52840 Sense bootloader"
            echo "  zmk --reset        - build ZMK settings reset firmware"
            echo "  gui                - launch GUI dev server"
          '';
        };
      }
    );
}
