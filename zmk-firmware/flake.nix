{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    zmk-nix = {
      url = "github:lilyinstarlight/zmk-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, zmk-nix }: let
    forAllSystems = nixpkgs.lib.genAttrs (nixpkgs.lib.attrNames zmk-nix.packages);
  in {
    packages = forAllSystems (system: rec {
      default = firmware;

      firmware = zmk-nix.legacyPackages.${system}.buildSplitKeyboard {
        name = "totem-firmware";

        src = nixpkgs.lib.sourceFilesBySuffices self [ ".board" ".cmake" ".conf" ".defconfig" ".dts" ".dtsi" ".json" ".keymap" ".overlay" ".shield" ".yml" "_defconfig" ];

        board = "xiao_ble";
        shield = "totem_%PART%";

        zephyrDepsHash = "sha256-+FTVUUnfgHMRLM17GghIdUIEgoAmlQNXm13jPXLR03k=";

        meta = {
          description = "TOTEM split keyboard ZMK firmware";
          license = nixpkgs.lib.licenses.mit;
          platforms = nixpkgs.lib.platforms.all;
        };
      };

      settings_reset = zmk-nix.legacyPackages.${system}.buildKeyboard {
        name = "settings-reset";
        src = nixpkgs.lib.sourceFilesBySuffices self [ ".yml" ];
        board = "xiao_ble";
        shield = "settings_reset";
        zephyrDepsHash = "sha256-+FTVUUnfgHMRLM17GghIdUIEgoAmlQNXm13jPXLR03k=";
      };

      flash = zmk-nix.packages.${system}.flash.override { inherit firmware; };
      update = zmk-nix.packages.${system}.update;
    });

    devShells = forAllSystems (system: {
      default = zmk-nix.devShells.${system}.default;
    });
  };
}
