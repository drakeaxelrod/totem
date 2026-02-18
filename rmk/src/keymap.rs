use rmk::types::action::{Action, KeyAction, KeyboardAction, MorseMode, MorseProfile};
use rmk::types::modifier::ModifierCombination;
use rmk::{a, k, ltp, mtp, tg, user, wm};

pub(crate) const ROW: usize = 4;
pub(crate) const COL: usize = 10;
pub(crate) const NUM_LAYER: usize = 6;

// HRM: conservative for home row mods — unilateral_tap + permissive_hold + 280ms
pub(crate) const HRM: MorseProfile = MorseProfile::new(
    Some(true),
    Some(MorseMode::PermissiveHold),
    Some(280),
    Some(250),
);

// TH: responsive thumb layer activation — hold_on_other_press + 200ms
pub(crate) const TH: MorseProfile = MorseProfile::new(
    Some(false),
    Some(MorseMode::HoldOnOtherPress),
    Some(200),
    Some(200),
);

// Hyper modifier combinations (all 4 mods on one side)
pub(crate) const HYPER_L: ModifierCombination = ModifierCombination::new()
    .with_left_shift(true)
    .with_left_ctrl(true)
    .with_left_alt(true)
    .with_left_gui(true);

pub(crate) const HYPER_R: ModifierCombination = ModifierCombination::new()
    .with_right_shift(true)
    .with_right_ctrl(true)
    .with_right_alt(true)
    .with_right_gui(true);

// Shorthand for CapsWordToggle
const CWT: KeyAction =
    KeyAction::Single(Action::KeyboardControl(KeyboardAction::CapsWordToggle));

#[rustfmt::skip]
pub const fn get_default_keymap() -> [[[KeyAction; COL]; ROW]; NUM_LAYER] {
    [
        // Layer 0: Base (Gallium)
        // Top:    B  L  D  C  V  |  J  Y  O  U  ,
        // Home:   N  R  T  S  G  |  P  H  A  E  I   (HRM: Gui Alt Ctrl Shift | Shift Ctrl Alt Gui)
        // Bottom: X  Q  M  W  Z  |  K  F  '  ;  .
        // Thumbs: LShift _ Esc(Util) Space(Nav) Tab | Enter Bksp(Num) Del(Fun) _ RShift
        [
            [k!(B),      k!(L),      k!(D),      k!(C),      k!(V),      k!(J),      k!(Y),      k!(O),      k!(U),      k!(Comma)   ],
            [mtp!(N, ModifierCombination::LGUI, HRM), mtp!(R, ModifierCombination::LALT, HRM), mtp!(T, ModifierCombination::LCTRL, HRM), mtp!(S, ModifierCombination::LSHIFT, HRM), k!(G), k!(P), mtp!(H, ModifierCombination::RSHIFT, HRM), mtp!(A, ModifierCombination::RCTRL, HRM), mtp!(E, ModifierCombination::RALT, HRM), mtp!(I, ModifierCombination::RGUI, HRM)],
            [k!(X),      k!(Q),      k!(M),      mtp!(W, HYPER_L, HRM), k!(Z), k!(K), mtp!(F, HYPER_R, HRM), k!(Quote), k!(Semicolon), k!(Dot)],
            [k!(LShift), a!(No),     ltp!(4, Escape, TH), ltp!(1, Space, TH), k!(Tab), k!(Enter), ltp!(2, Backspace, TH), ltp!(3, Delete, TH), a!(No), k!(RShift)],
        ],
        // Layer 1: Nav (hold Space)
        // Left: editing + explicit mods, Right: vim arrows + Home/End/PgUp/PgDn
        [
            [k!(Undo),   k!(Cut),    k!(Copy),   k!(Paste),  k!(Again),  k!(Home),   k!(PageDown), k!(PageUp), k!(End),  k!(Delete)  ],
            [k!(LGui),   k!(LAlt),   k!(LCtrl),  k!(LShift), a!(No),     a!(No),     k!(Left),   k!(Down),   k!(Up),     k!(Right)   ],
            [a!(No),     a!(No),     a!(No),     a!(No),     a!(No),     k!(Insert), CWT,        k!(Menu),   a!(No),     a!(No)      ],
            [k!(WwwBack), a!(No),    a!(No),     a!(No),     a!(No),     a!(No),     a!(No),     a!(No),     a!(No),     k!(WwwForward)],
        ],
        // Layer 2: Num (hold Backspace)
        // Left: numpad + operators, Right: explicit mods for chording
        [
            [k!(KpPlus), k!(Kc7),    k!(Kc8),    k!(Kc9),    k!(Kc0),    a!(No),     a!(No),     a!(No),     a!(No),     a!(No)      ],
            [k!(KpAsterisk), k!(Kc4), k!(Kc5),   k!(Kc6),    k!(Equal),  a!(No),     k!(LShift), k!(LCtrl),  k!(LAlt),   k!(LGui)    ],
            [k!(Minus),  k!(Kc1),    k!(Kc2),    k!(Kc3),    k!(Slash),  a!(No),     a!(No),     a!(No),     a!(No),     a!(No)      ],
            [wm!(Kc9, ModifierCombination::LSHIFT), a!(No), a!(No), k!(Dot), k!(Semicolon), a!(No), a!(No), a!(No), a!(No), wm!(Kc0, ModifierCombination::LSHIFT)],
        ],
        // Layer 3: Function (hold Delete)
        // Left: F-keys in numpad layout, Right: volume/media/brightness + mods
        [
            [k!(F12),    k!(F7),     k!(F8),     k!(F9),     a!(No),     k!(PrintScreen), k!(AudioVolDown), k!(AudioVolUp), k!(AudioMute), k!(ScrollLock)],
            [k!(F11),    k!(F4),     k!(F5),     k!(F6),     a!(No),     a!(No),     k!(LShift), k!(LCtrl),  k!(LAlt),   k!(LGui)    ],
            [k!(F10),    k!(F1),     k!(F2),     k!(F3),     a!(No),     k!(Pause),  k!(BrightnessDown), k!(BrightnessUp), a!(No), a!(No)],
            [a!(No),     a!(No),     a!(No),     a!(No),     a!(No),     k!(MediaPlayPause), k!(MediaPrevTrack), k!(MediaNextTrack), a!(No), tg!(5)],
        ],
        // Layer 4: Util + Mouse (hold Escape)
        // Left: BLE + accel, Right: vim-like mouse movement + scroll
        [
            [user!(0),   user!(1),   user!(2),   user!(5),   a!(No),     k!(MouseWheelUp), k!(MouseWheelDown), k!(AudioVolUp), k!(MouseWheelLeft), k!(MouseWheelRight)],
            [k!(LGui),   k!(LAlt),   k!(LCtrl),  k!(LShift), a!(No),    a!(No),     k!(MouseLeft), k!(MouseDown), k!(MouseUp), k!(MouseRight)],
            [user!(6),   k!(MouseAccel0), k!(MouseAccel1), k!(MouseAccel2), a!(No), a!(No), k!(MouseBtn4), k!(MouseBtn5), a!(No), a!(No)],
            [a!(No),     a!(No),     a!(No),     a!(No),     a!(No),     k!(MouseBtn1), k!(MouseBtn2), k!(MouseBtn3), k!(AudioVolDown), k!(AudioMute)],
        ],
        // Layer 5: Gaming (toggle via TG(5) from Function layer)
        // WASD movement, dedicated mods on bottom (no HRM)
        [
            [k!(Q),      k!(W),      k!(E),      k!(R),      k!(T),      k!(Kc1),    k!(Kc2),    k!(Kc3),    k!(Kc4),    k!(Kc5)    ],
            [k!(A),      k!(S),      k!(D),      k!(F),      k!(G),      k!(Kc6),    k!(Kc7),    k!(Kc8),    k!(Kc9),    k!(Kc0)    ],
            [mtp!(Z, ModifierCombination::LCTRL, MorseProfile::const_default()), mtp!(X, ModifierCombination::LGUI, MorseProfile::const_default()), mtp!(C, ModifierCombination::LALT, MorseProfile::const_default()), k!(V), k!(B), k!(N), k!(M), k!(Comma), k!(Dot), k!(Slash)],
            [k!(Tab),    a!(No),     k!(Escape), k!(Space),  k!(LShift), k!(Enter),  k!(Backspace), k!(Delete), a!(No),  tg!(5)      ],
        ],
    ]
}
