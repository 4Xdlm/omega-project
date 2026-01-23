# OMEGA Phase 7 — RCE-01 Premium Environment
# Standard: NASA-Grade L4 / DO-178C Level A
# Version: 1.2

FROM node:20.11.0-slim

# Build arguments (REQUIRED - build fails without them)
ARG ANISO_MIN
ARG ANISO_MAX
ARG OPACITY_BASE
ARG OPACITY_Z_COEF
ARG OXYGEN_AMP_MAX
ARG RENDER_TIMEOUT

# Validate all required arguments
RUN test -n "$ANISO_MIN" || (echo "ERROR: ANISO_MIN is required" && exit 1)
RUN test -n "$ANISO_MAX" || (echo "ERROR: ANISO_MAX is required" && exit 1)
RUN test -n "$OPACITY_BASE" || (echo "ERROR: OPACITY_BASE is required" && exit 1)
RUN test -n "$OPACITY_Z_COEF" || (echo "ERROR: OPACITY_Z_COEF is required" && exit 1)
RUN test -n "$OXYGEN_AMP_MAX" || (echo "ERROR: OXYGEN_AMP_MAX is required" && exit 1)
RUN test -n "$RENDER_TIMEOUT" || (echo "ERROR: RENDER_TIMEOUT is required" && exit 1)

# Set environment variables
ENV ANISO_MIN=$ANISO_MIN
ENV ANISO_MAX=$ANISO_MAX
ENV OPACITY_BASE=$OPACITY_BASE
ENV OPACITY_Z_COEF=$OPACITY_Z_COEF
ENV OXYGEN_AMP_MAX=$OXYGEN_AMP_MAX
ENV RENDER_TIMEOUT=$RENDER_TIMEOUT

# Install system dependencies for Playwright/Chromium
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install dependencies with strict lockfile
RUN npm ci

# Install Playwright with Chromium
RUN npx playwright install chromium --with-deps

# Generate SBOM
RUN npm list --json > SBOM.json

# Copy source code
COPY . .

# Inject calibration values into profile template
RUN sed -e "s/\${ANISO_MIN}/$ANISO_MIN/g" \
        -e "s/\${ANISO_MAX}/$ANISO_MAX/g" \
        -e "s/\${OPACITY_BASE}/$OPACITY_BASE/g" \
        -e "s/\${OPACITY_Z_COEF}/$OPACITY_Z_COEF/g" \
        -e "s/\${OXYGEN_AMP_MAX}/$OXYGEN_AMP_MAX/g" \
        -e "s/\${RENDER_TIMEOUT}/$RENDER_TIMEOUT/g" \
        render/profiles/RCE-01.template.json > render/profiles/RCE-01.json

# Validate no unsubstituted symbols remain
RUN if grep -q '\${' render/profiles/RCE-01.json; then \
      echo "ERROR: Unsubstituted symbols found in RCE-01.json" && exit 1; \
    fi

# Build TypeScript
RUN npm run build

# Default command: run render
CMD ["npm", "run", "render"]
