FROM rust:1-bookworm

# Node.js 22 + pnpm
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# Tauri v2 system dependencies + zbus (libdbus) + hidapi (libudev)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgtk-3-dev libwebkit2gtk-4.1-dev libsoup-3.0-dev \
    libssl-dev pkg-config libglib2.0-dev \
    libcairo2-dev libpango1.0-dev libgdk-pixbuf-2.0-dev \
    libatk1.0-dev librsvg2-dev \
    libdbus-1-dev libudev-dev \
    xdg-utils file \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /work
