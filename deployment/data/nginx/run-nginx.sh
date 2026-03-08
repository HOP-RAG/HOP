#!/bin/sh
set -e

# Redirect all output to stderr for visibility
exec 2>&1

# Print startup info with timestamps
echo "==============================================="
echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Starting nginx configuration script"
echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Arguments: $@"
echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Script: $0"
echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] PWD: $(pwd)"
echo "==============================================="

# Check if template file exists before proceeding
TEMPLATE_NAME="${1:-app.conf.template}"
if [ ! -f "/etc/nginx/conf.d/$TEMPLATE_NAME" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - [ERROR] Template file not found: /etc/nginx/conf.d/$TEMPLATE_NAME"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - [ERROR] Available files in /etc/nginx/conf.d:"
  ls -la /etc/nginx/conf.d/
  exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Template file found: $TEMPLATE_NAME"

# fill in the template
export ONYX_BACKEND_API_HOST="${ONYX_BACKEND_API_HOST:-api_server}"
export ONYX_WEB_SERVER_HOST="${ONYX_WEB_SERVER_HOST:-web_server}"
export ONYX_MCP_SERVER_HOST="${ONYX_MCP_SERVER_HOST:-mcp_server}"

export SSL_CERT_FILE_NAME="${SSL_CERT_FILE_NAME:-ssl.crt}"
export SSL_CERT_KEY_FILE_NAME="${SSL_CERT_KEY_FILE_NAME:-ssl.key}"

# Nginx timeout settings (in seconds)
export NGINX_PROXY_CONNECT_TIMEOUT="${NGINX_PROXY_CONNECT_TIMEOUT:-300}"
export NGINX_PROXY_SEND_TIMEOUT="${NGINX_PROXY_SEND_TIMEOUT:-300}"
export NGINX_PROXY_READ_TIMEOUT="${NGINX_PROXY_READ_TIMEOUT:-300}"

echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Configuration:"
echo "$(date '+%Y-%m-%d %H:%M:%S') -   API server: $ONYX_BACKEND_API_HOST"
echo "$(date '+%Y-%m-%d %H:%M:%S') -   Web server: $ONYX_WEB_SERVER_HOST"
echo "$(date '+%Y-%m-%d %H:%M:%S') -   MCP server: $ONYX_MCP_SERVER_HOST"
echo "$(date '+%Y-%m-%d %H:%M:%S') -   Timeouts: connect=${NGINX_PROXY_CONNECT_TIMEOUT}s, send=${NGINX_PROXY_SEND_TIMEOUT}s, read=${NGINX_PROXY_READ_TIMEOUT}s"

echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Running envsubst on template..."
if ! envsubst '$DOMAIN $SSL_CERT_FILE_NAME $SSL_CERT_KEY_FILE_NAME $ONYX_BACKEND_API_HOST $ONYX_WEB_SERVER_HOST $ONYX_MCP_SERVER_HOST $NGINX_PROXY_CONNECT_TIMEOUT $NGINX_PROXY_SEND_TIMEOUT $NGINX_PROXY_READ_TIMEOUT' < "/etc/nginx/conf.d/$TEMPLATE_NAME" > /etc/nginx/conf.d/app.conf; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - [ERROR] envsubst failed for template: $TEMPLATE_NAME"
  exit 1
fi

if [ ! -f /etc/nginx/conf.d/app.conf ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - [ERROR] app.conf was not created!"
  exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Successfully generated nginx configuration"
ls -lh /etc/nginx/conf.d/app.conf

# Conditionally create MCP server configuration
if [ "${MCP_SERVER_ENABLED}" = "True" ] || [ "${MCP_SERVER_ENABLED}" = "true" ]; then
  echo "MCP server is enabled, creating MCP configuration..."
  envsubst '$ONYX_MCP_SERVER_HOST' < "/etc/nginx/conf.d/mcp_upstream.conf.inc.template" > /etc/nginx/conf.d/mcp_upstream.conf.inc
  envsubst '$ONYX_MCP_SERVER_HOST' < "/etc/nginx/conf.d/mcp.conf.inc.template" > /etc/nginx/conf.d/mcp.conf.inc
else
  echo "MCP server is disabled, removing MCP configuration..."
  # Leave empty placeholder files so nginx includes do not fail
  # These files are empty because MCP server is disabled
  echo "# Empty file - MCP server is disabled" > /etc/nginx/conf.d/mcp_upstream.conf.inc
  echo "# Empty file - MCP server is disabled" > /etc/nginx/conf.d/mcp.conf.inc
fi

# wait for the api_server to be ready
echo "==============================================="
echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Waiting for API server at http://${ONYX_BACKEND_API_HOST}:8080"
echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] This may take a minute or two..."
echo "==============================================="

max_wait=300  # 5 minutes in seconds
wait_interval=5
elapsed=0
attempt=0

while [ $elapsed -lt $max_wait ]; do
  attempt=$((attempt + 1))
  # Use curl to send a request and capture the HTTP status code
  # Set a connection timeout and a max time to avoid hanging
  status_code=$(curl -o /dev/null -s -w "%{http_code}" --connect-timeout 5 --max-time 10 "http://${ONYX_BACKEND_API_HOST}:8080/health" 2>/dev/null || echo "000")

  if [ "$status_code" = "200" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] ✓ API server is healthy (attempt $attempt, total time ${elapsed}s)"
    break
  else
    elapsed=$((elapsed + wait_interval))
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] API server returned $status_code (attempt $attempt, $elapsed/${max_wait}s elapsed)"

    if [ $elapsed -lt $max_wait ]; then
      echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Retrying in ${wait_interval} seconds..."
      sleep $wait_interval
    fi
  fi
done

if [ $elapsed -ge $max_wait ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - [ERROR] API server health check timed out after ${max_wait}s"
  exit 1
fi

# Start nginx
echo "==============================================="
echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Starting nginx server..."
echo "==============================================="

# Test nginx config before starting
if ! nginx -t 2>&1; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - [ERROR] Nginx configuration test failed!"
  exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Nginx config test passed"
echo "$(date '+%Y-%m-%d %H:%M:%S') - [nginx] Starting nginx in foreground..."

# Start nginx and reload every 6 hours
while :; do sleep 21600 & wait; nginx -s reload; done & nginx -g "daemon off;"
