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
          cd "$(git rev-parse --show-toplevel)/rmk-firmware"
          echo "Building TOTEM RMK firmware..."
          cargo make uf2
          echo ""
          echo "UF2 files ready:"
          ls -lh build/*.uf2
        '';

        zmk-firmware-script = pkgs.writeShellScriptBin "zmk-firmware" ''
          set -e
          ROOT="$(git rev-parse --show-toplevel)"
          echo "Building TOTEM ZMK firmware..."
          nix build "path:$ROOT/zmk-firmware" --no-link --print-out-paths | while read -r outpath; do
            mkdir -p "$ROOT/zmk-firmware/build"
            for uf2 in "$outpath"/*.uf2; do
              cp "$uf2" "$ROOT/zmk-firmware/build/"
            done
          done
          echo ""
          echo "UF2 files ready:"
          ls -lh "$ROOT/zmk-firmware/build/"*.uf2
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
          ];

          packages = [
            rmk-firmware-script
            zmk-firmware-script
            gui-script
          ];

          LIBCLANG_PATH = "${pkgs.llvmPackages.libclang.lib}/lib";
          BINDGEN_EXTRA_CLANG_ARGS = "-isystem ${pkgs.llvmPackages.libclang.lib}/lib/clang/${pkgs.lib.getVersion pkgs.llvmPackages.clang}/include";

          shellHook = ''
            echo "TOTEM development environment"
            echo "  rmk-firmware  - build RMK firmware UF2 files"
            echo "  gui           - launch GUI dev server"
            echo "  zmk-firmware  - build ZMK firmware UF2 files"
          '';
        };
      }
    );
}
