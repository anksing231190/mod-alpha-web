# Static website served by nginx. Build arg APP_ENV = stage | prod.
FROM node:22-alpine AS build
ARG APP_ENV=stage
ARG WEB_API_BASE_URL
ARG WEB_RAZORPAY_KEY_ID
ARG WEB_GOOGLE_CLIENT_ID
WORKDIR /app
COPY scripts/build-web.mjs scripts/
COPY apps/web apps/web
RUN WEB_API_BASE_URL=$WEB_API_BASE_URL WEB_RAZORPAY_KEY_ID=$WEB_RAZORPAY_KEY_ID WEB_GOOGLE_CLIENT_ID=$WEB_GOOGLE_CLIENT_ID node scripts/build-web.mjs $APP_ENV && mv dist/web-$APP_ENV /site

FROM nginx:1.27-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site /usr/share/nginx/html
EXPOSE 80
