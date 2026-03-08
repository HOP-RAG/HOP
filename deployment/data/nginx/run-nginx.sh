set -e

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

echo "Using API server host: $ONYX_BACKEND_API_HOST"
echo "Using web server host: $ONYX_WEB_SERVER_HOST"
echo "Using MCP server host: $ONYX_MCP_SERVER_HOST"
echo "Using nginx proxy timeouts - connect: ${NGINX_PROXY_CONNECT_TIMEOUT}s, send: ${NGINX_PROXY_SEND_TIMEOUT}s, read: ${NGINX_PROXY_READ_TIMEOUT}s"
echo "Processing template: $1"

if [ ! -f "/etc/nginx/conf.d/$1" ]; then
  echo "ERROR: Template file /etc/nginx/conf.d/$1 not found!"
  exit 1
fi

envsubst '$DOMAIN $SSL_CERT_FILE_NAME $SSL_CERT_KEY_FILE_NAME $ONYX_BACKEND_API_HOST $ONYX_WEB_SERVER_HOST $ONYX_MCP_SERVER_HOST $NGINX_PROXY_CONNECT_TIMEOUT $NGINX_PROXY_SEND_TIMEOUT $NGINX_PROXY_READ_TIMEOUT' < "/etc/nginx/conf.d/$1" > /etc/nginx/conf.d/app.conf
echo "Generated nginx configuration at /etc/nginx/conf.d/app.conf"

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
echo "Waiting for API server to boot up; this may take a minute or two..."
echo "If this takes more than ~5 minutes, check the logs of the API server container for errors with the following command:"
echo
echo "docker logs onyx-api_server-1"
echo

max_wait=300  # 5 minutes in seconds
wait_interval=5
elapsed=0

while [ $elapsed -lt $max_wait ]; do
  # Use curl to send a request and capture the HTTP status code
  # Set a connection timeout and a max time to avoid hanging
  status_code=$(curl -o /dev/null -s -w "%{http_code}" --connect-timeout 5 --max-time 10 "http://${ONYX_BACKEND_API_HOST}:8080/health" 2>/dev/null || echo "000")

  # Check if the status code is 200
  if [ "$status_code" = "200" ]; then
    echo "API server responded with 200, starting nginx..."
    break  # Exit the loop
  else
    elapsed=$((elapsed + wait_interval))
    if [ $elapsed -lt $max_wait ]; then
      echo "API server responded with $status_code, retrying in ${wait_interval} seconds... ($elapsed/${max_wait}s elapsed)"
      sleep $wait_interval
    fi
  fi
done

if [ $elapsed -ge $max_wait ]; then
  echo "ERROR: API server health check timed out after ${max_wait}s"
  exit 1
fi

# Start nginx and reload every 6 hours
while :; do sleep 6h & wait; nginx -s reload; done & nginx -g "daemon off;"
