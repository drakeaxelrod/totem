fn main() {
    // Compile ZMK Studio protobuf definitions
    prost_build::Config::new()
        .compile_protos(
            &[
                "proto/zmk/studio.proto",
                "proto/zmk/core.proto",
                "proto/zmk/keymap.proto",
                "proto/zmk/behaviors.proto",
                "proto/zmk/meta.proto",
            ],
            &["proto"],
        )
        .expect("Failed to compile protobuf definitions");

    tauri_build::build()
}
