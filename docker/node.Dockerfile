# Node + pnpm + Playwright browsers (Chromium, Firefox, WebKit).
# Keep the tag in sync with @playwright/test in playground/package.json.
FROM mcr.microsoft.com/playwright:v1.65.0-noble

RUN npm install -g pnpm@12.16.1

ENV PNPM_HOME=/pnpm \
    npm_config_store_dir=/pnpm/store \
    CI=true
WORKDIR /app
