{
  description = "TOTEM split keyboard - firmware and reference app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };

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
            # Swap to dongle config, clean to force proc-macro rebuild
            cp keyboard.toml keyboard.toml.bak
            cp keyboard-dongle.toml keyboard.toml
            trap 'mv keyboard.toml.bak keyboard.toml' EXIT

            cargo clean --release 2>/dev/null || true

            echo "Building dongle (USB receiver)..."
            cargo build --release --bin central
            echo "Building left half (peripheral 0)..."
            cargo build --release --bin peripheral
            echo "Building right half (peripheral 1)..."
            cargo build --release --bin peripheral2

            echo "Converting to UF2..."
            uf2 central totem-dongle
            uf2 peripheral totem-left
            uf2 peripheral2 totem-right

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
          ];

          packages = [
            firmware-script
            gui-script
          ];

          LIBCLANG_PATH = "${pkgs.llvmPackages.libclang.lib}/lib";
          BINDGEN_EXTRA_CLANG_ARGS = "-isystem ${pkgs.llvmPackages.libclang.lib}/lib/clang/${pkgs.lib.getVersion pkgs.llvmPackages.clang}/include";

          shellHook = ''
            echo "TOTEM development environment"
            echo "  firmware           - build normal mode (left=central, right=peripheral)"
            echo "  firmware --dongle  - build dongle mode (dongle + left + right)"
            echo "  gui       - launch GUI dev server"
          '';
        };
      }
    );
}
