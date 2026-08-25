FROM nginx:alpine

COPY public /usr/share/nginx/html

# Runtime env injection: replaces BACKEND_URL placeholder in index.html
# with the actual backend ALB DNS at container startup, so the same image
# works for both Mumbai and Ohio just by changing the env var.
COPY docker-entrypoint.sh /docker-entrypoint.d/30-inject-backend-url.sh
RUN chmod +x /docker-entrypoint.d/30-inject-backend-url.sh

ENV BACKEND_URL=http://localhost:3000

EXPOSE 80
