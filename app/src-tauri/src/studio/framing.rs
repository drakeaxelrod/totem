/// ZMK Studio wire framing protocol.
///
/// Framing bytes:
///   0xAB = Start of Frame (SoF)
///   0xAC = Escape (Esc)
///   0xAD = End of Frame (EoF)
///
/// Any payload byte matching a framing byte is escaped by prefixing with 0xAC.

const SOF: u8 = 0xAB;
const ESC: u8 = 0xAC;
const EOF_BYTE: u8 = 0xAD;

/// Encode a protobuf payload into a framed message.
pub fn encode(payload: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(payload.len() + 4);
    out.push(SOF);
    for &b in payload {
        if b == SOF || b == ESC || b == EOF_BYTE {
            out.push(ESC);
        }
        out.push(b);
    }
    out.push(EOF_BYTE);
    out
}

/// Accumulates raw bytes and extracts complete framed messages.
pub struct FrameDecoder {
    in_frame: bool,
    escaped: bool,
    payload: Vec<u8>,
}

impl FrameDecoder {
    pub fn new() -> Self {
        Self {
            in_frame: false,
            escaped: false,
            payload: Vec::new(),
        }
    }

    /// Feed raw bytes from the transport. Returns any complete decoded payloads.
    pub fn feed(&mut self, data: &[u8]) -> Vec<Vec<u8>> {
        let mut frames = Vec::new();
        for &b in data {
            if self.escaped {
                self.escaped = false;
                if self.in_frame {
                    self.payload.push(b);
                }
                continue;
            }
            match b {
                SOF => {
                    // Start a new frame (reset any partial state)
                    self.in_frame = true;
                    self.escaped = false;
                    self.payload.clear();
                }
                ESC => {
                    self.escaped = true;
                }
                EOF_BYTE => {
                    if self.in_frame && !self.payload.is_empty() {
                        frames.push(std::mem::take(&mut self.payload));
                    }
                    self.in_frame = false;
                    self.escaped = false;
                }
                _ => {
                    if self.in_frame {
                        self.payload.push(b);
                    }
                }
            }
        }
        frames
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_simple() {
        let payload = b"hello";
        let framed = encode(payload);
        let mut dec = FrameDecoder::new();
        let frames = dec.feed(&framed);
        assert_eq!(frames.len(), 1);
        assert_eq!(frames[0], payload);
    }

    #[test]
    fn round_trip_with_special_bytes() {
        let payload = vec![0x01, SOF, 0x02, ESC, 0x03, EOF_BYTE, 0x04];
        let framed = encode(&payload);
        let mut dec = FrameDecoder::new();
        let frames = dec.feed(&framed);
        assert_eq!(frames.len(), 1);
        assert_eq!(frames[0], payload);
    }

    #[test]
    fn multiple_frames_in_stream() {
        let a = encode(b"one");
        let b_framed = encode(b"two");
        let mut stream = Vec::new();
        stream.extend_from_slice(&a);
        stream.extend_from_slice(&b_framed);

        let mut dec = FrameDecoder::new();
        let frames = dec.feed(&stream);
        assert_eq!(frames.len(), 2);
        assert_eq!(frames[0], b"one");
        assert_eq!(frames[1], b"two");
    }

    #[test]
    fn partial_feed() {
        let framed = encode(b"split");
        let mid = framed.len() / 2;
        let mut dec = FrameDecoder::new();
        let frames1 = dec.feed(&framed[..mid]);
        assert!(frames1.is_empty());
        let frames2 = dec.feed(&framed[mid..]);
        assert_eq!(frames2.len(), 1);
        assert_eq!(frames2[0], b"split");
    }
}
