#!/bin/sh
set -e

# Replace the placeholder with the real backend URL, provided via the
# BACKEND_URL environment variable (set in the k8s Deployment / manifest).
sed -i "s|__BACKEND_URL__|${BACKEND_URL}|g" /usr/share/nginx/html/index.html
