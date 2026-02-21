{
  description = "TOTEM split keyboard — ZMK firmware & config";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";

    # Zephyr SDK + Python environment for ZMK builds
    zephyr = {
      url = "github:zmkfirmware/zephyr/v4.1.0+zmk-fixes";
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
            protobuf

            # nanopb needs google.protobuf Python module
            python3Packages.protobuf

            # Tools
            just
            picocom
          ];

          env = {
            PYTHONPATH = "${zephyr.pythonEnv}/${zephyr.pythonEnv.sitePackages}";
          };

          shellHook = ''
            echo "TOTEM keyboard — run 'just' to see available commands"
          '';
        };
      }
    );
}
