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
        # Shell commands available inside nix develop
        rmk-firmware-script = pkgs.writeShellScriptBin "rmk-firmware" ''
          set -e
          ROOT="$(git rev-parse --show-toplevel)"
          mkdir -p "$ROOT/build"
          cd "$ROOT"
          docker compose run --rm rmk
          echo ""
          echo "UF2 files ready:"
          ls -lh "$ROOT/build"/rmk-*.uf2
        '';

        zmk-firmware-script = pkgs.writeShellScriptBin "zmk-firmware" ''
          set -e
          ROOT="$(git rev-parse --show-toplevel)"
          mkdir -p "$ROOT/build"
          cd "$ROOT"
          docker compose run --rm zmk
          echo ""
          echo "UF2 files ready:"
          ls -lh "$ROOT/build"/zmk-*.uf2
        '';

        build-all-script = pkgs.writeShellScriptBin "build-all" ''
          set -e
          ROOT="$(git rev-parse --show-toplevel)"
          mkdir -p "$ROOT/build"
          cd "$ROOT"

          echo "════════════════════════════════════════"
          echo " Building TOTEM firmware + app"
          echo "════════════════════════════════════════"

          docker compose up --build --abort-on-container-exit

          echo ""
          echo "════════════════════════════════════════"
          echo " All builds complete!"
          echo "════════════════════════════════════════"
          ls -lh "$ROOT/build/"
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
            rmk-firmware-script
            zmk-firmware-script
            build-all-script
            gui-script
          ];

          LIBCLANG_PATH = "${pkgs.llvmPackages.libclang.lib}/lib";
          BINDGEN_EXTRA_CLANG_ARGS = "-isystem ${pkgs.llvmPackages.libclang.lib}/lib/clang/${pkgs.lib.getVersion pkgs.llvmPackages.clang}/include";

          shellHook = ''
            echo "TOTEM development environment"
            echo "  rmk-firmware  - build RMK firmware (Docker)"
            echo "  zmk-firmware  - build ZMK firmware (Docker)"
            echo "  build-all     - build everything via docker compose"
            echo "  gui           - launch GUI dev server"
          '';
        };
      }
    );
}
