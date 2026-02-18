use embassy_time::Duration;
use rmk::combo::{Combo, ComboConfig};
use rmk::config::{BehaviorConfig, MouseKeyConfig, OneShotConfig};
use rmk::fork::{Fork, StateBits};
use rmk::types::action::{MorseMode, MorseProfile};
use rmk::types::led_indicator::LedIndicator;
use rmk::types::modifier::ModifierCombination;
use rmk::types::mouse_button::MouseButtons;
use rmk::{k, kbctrl, mtp, wm};

use crate::keymap::{HRM, HYPER_L, HYPER_R};

// Shorthand for modifier constants
const LS: ModifierCombination = ModifierCombination::LSHIFT;

pub fn get_behavior_config() -> BehaviorConfig {
    let mut cfg = BehaviorConfig::default();

    // Morse (tap-hold global config)
    cfg.morse.enable_flow_tap = true;
    cfg.morse.prior_idle_time = Duration::from_millis(150);
    cfg.morse.default_profile =
        MorseProfile::new(Some(false), Some(MorseMode::Normal), Some(250), Some(250));

    // One-shot
    cfg.one_shot = OneShotConfig {
        timeout: Duration::from_secs(1),
    };

    // Mouse
    cfg.mouse_key = MouseKeyConfig {
        repeat_interval_ms: 10,
        wheel_repeat_interval_ms: 50,
        ..Default::default()
    };

    // Combos — timeout 80ms, 28 combos
    cfg.combo.timeout = Duration::from_millis(80);

    // Home row mod shorthand keys (must match keymap exactly)
    let r_alt = mtp!(R, ModifierCombination::LALT, HRM);
    let t_ctrl = mtp!(T, ModifierCombination::LCTRL, HRM);
    let s_shift = mtp!(S, ModifierCombination::LSHIFT, HRM);
    let h_shift = mtp!(H, ModifierCombination::RSHIFT, HRM);
    let a_ctrl = mtp!(A, ModifierCombination::RCTRL, HRM);
    let e_alt = mtp!(E, ModifierCombination::RALT, HRM);
    let i_gui = mtp!(I, ModifierCombination::RGUI, HRM);
    let w_hyper = mtp!(W, HYPER_L, HRM);
    let f_hyper = mtp!(F, HYPER_R, HRM);

    // Left vertical: top + home row — @ # $ %
    cfg.combo.combos[0] = Some(Combo::new(ComboConfig::new(
        [k!(L), r_alt],
        wm!(Kc2, LS), // @
        None,
    )));
    cfg.combo.combos[1] = Some(Combo::new(ComboConfig::new(
        [k!(D), t_ctrl],
        wm!(Kc3, LS), // #
        None,
    )));
    cfg.combo.combos[2] = Some(Combo::new(ComboConfig::new(
        [k!(C), s_shift],
        wm!(Kc4, LS), // $
        None,
    )));
    cfg.combo.combos[3] = Some(Combo::new(ComboConfig::new(
        [k!(V), k!(G)],
        wm!(Kc5, LS), // %
        None,
    )));

    // Left vertical: home + bottom row — ` \ = ~
    cfg.combo.combos[4] = Some(Combo::new(ComboConfig::new(
        [r_alt, k!(Q)],
        k!(Grave), // `
        None,
    )));
    cfg.combo.combos[5] = Some(Combo::new(ComboConfig::new(
        [t_ctrl, k!(M)],
        k!(Backslash), // backslash
        None,
    )));
    cfg.combo.combos[6] = Some(Combo::new(ComboConfig::new(
        [s_shift, w_hyper],
        k!(Equal), // =
        None,
    )));
    cfg.combo.combos[7] = Some(Combo::new(ComboConfig::new(
        [k!(G), k!(Z)],
        wm!(Grave, LS), // ~
        None,
    )));

    // Left horizontal: Escape (R+T+S), clipboard (Ctrl+X/C/V)
    cfg.combo.combos[8] = Some(Combo::new(ComboConfig::new(
        [r_alt, t_ctrl, s_shift],
        k!(Escape),
        None,
    )));
    cfg.combo.combos[9] = Some(Combo::new(ComboConfig::new(
        [k!(Q), w_hyper],
        wm!(X, ModifierCombination::LCTRL), // Ctrl+X
        None,
    )));
    cfg.combo.combos[10] = Some(Combo::new(ComboConfig::new(
        [k!(Q), k!(M)],
        wm!(C, ModifierCombination::LCTRL), // Ctrl+C
        None,
    )));
    cfg.combo.combos[11] = Some(Combo::new(ComboConfig::new(
        [k!(M), w_hyper],
        wm!(V, ModifierCombination::LCTRL), // Ctrl+V
        None,
    )));

    // Right vertical: top + home row — ^ + * &
    cfg.combo.combos[12] = Some(Combo::new(ComboConfig::new(
        [k!(J), k!(P)],
        wm!(Kc6, LS), // ^
        None,
    )));
    cfg.combo.combos[13] = Some(Combo::new(ComboConfig::new(
        [k!(Y), h_shift],
        wm!(Equal, LS), // +
        None,
    )));
    cfg.combo.combos[14] = Some(Combo::new(ComboConfig::new(
        [k!(O), a_ctrl],
        wm!(Kc8, LS), // *
        None,
    )));
    cfg.combo.combos[15] = Some(Combo::new(ComboConfig::new(
        [k!(U), e_alt],
        wm!(Kc7, LS), // &
        None,
    )));

    // Right vertical: home + bottom row — _ - / |
    cfg.combo.combos[16] = Some(Combo::new(ComboConfig::new(
        [k!(P), k!(K)],
        wm!(Minus, LS), // _
        None,
    )));
    cfg.combo.combos[17] = Some(Combo::new(ComboConfig::new(
        [h_shift, f_hyper],
        k!(Minus), // -
        None,
    )));
    cfg.combo.combos[18] = Some(Combo::new(ComboConfig::new(
        [a_ctrl, k!(Quote)],
        k!(Slash), // /
        None,
    )));
    cfg.combo.combos[19] = Some(Combo::new(ComboConfig::new(
        [e_alt, k!(Semicolon)],
        wm!(Backslash, LS), // |
        None,
    )));

    // Right horizontal: brackets [] () {} < >
    cfg.combo.combos[20] = Some(Combo::new(ComboConfig::new(
        [k!(Y), k!(O)],
        k!(LeftBracket), // [
        None,
    )));
    cfg.combo.combos[21] = Some(Combo::new(ComboConfig::new(
        [k!(O), k!(U)],
        k!(RightBracket), // ]
        None,
    )));
    cfg.combo.combos[22] = Some(Combo::new(ComboConfig::new(
        [h_shift, a_ctrl],
        wm!(Kc9, LS), // (
        None,
    )));
    cfg.combo.combos[23] = Some(Combo::new(ComboConfig::new(
        [a_ctrl, e_alt],
        wm!(Kc0, LS), // )
        None,
    )));
    cfg.combo.combos[24] = Some(Combo::new(ComboConfig::new(
        [f_hyper, k!(Quote)],
        wm!(LeftBracket, LS), // {
        None,
    )));
    cfg.combo.combos[25] = Some(Combo::new(ComboConfig::new(
        [k!(Quote), k!(Semicolon)],
        wm!(RightBracket, LS), // }
        None,
    )));
    cfg.combo.combos[26] = Some(Combo::new(ComboConfig::new(
        [k!(P), h_shift],
        wm!(Comma, LS), // <
        None,
    )));
    cfg.combo.combos[27] = Some(Combo::new(ComboConfig::new(
        [e_alt, i_gui],
        wm!(Dot, LS), // >
        None,
    )));

    // Caps word: both index fingers (S + H)
    // CapsWordToggle is a KeyboardControl action
    cfg.combo.combos[28] = Some(Combo::new(ComboConfig::new(
        [s_shift, h_shift],
        kbctrl!(CapsWordToggle),
        None,
    )));

    // Forks (mod-morphs) — change output based on active modifiers
    // Shift+, → ; (instead of <), Shift+. → : (instead of >)
    let shift_any = StateBits::new_from(
        ModifierCombination::LSHIFT | ModifierCombination::RSHIFT,
        LedIndicator::new(),
        MouseButtons::new(),
    );
    let _ = cfg.fork.forks.push(Fork::new(
        k!(Comma),
        k!(Comma),
        k!(Semicolon),
        shift_any,
        StateBits::default(),
        ModifierCombination::new(),
        false,
    ));
    let _ = cfg.fork.forks.push(Fork::new(
        k!(Dot),
        k!(Dot),
        wm!(Semicolon, LS), // Shift+; = :
        shift_any,
        StateBits::default(),
        ModifierCombination::new(),
        false,
    ));

    cfg
}
