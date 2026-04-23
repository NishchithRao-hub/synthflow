#!/bin/bash
# infra/deploy.sh
# Deploy SynthFlow to EC2
# Usage: bash infra/deploy.sh <EC2_PUBLIC_IP>

set -e

EC2_IP=$1
EC2_USER="${EC2_USER:-ec2-user}"
KEY_FILE_NAME="${SYNTHFLOW_SSH_KEY_NAME:-synthflow-key.pem}"
KEY_PATH="${SSH_KEY_PATH:-}"
REMOTE_DIR="${REMOTE_DIR:-/home/$EC2_USER/synthflow}"
SSH_STRICT_HOST_KEY_CHECKING="${SSH_STRICT_HOST_KEY_CHECKING:-yes}"
SSH_KNOWN_HOSTS_FILE="${SSH_KNOWN_HOSTS_FILE:-$HOME/.ssh/known_hosts}"

resolve_windows_profile_ssh_path() {
    local candidate=""
    local match

    if [ -n "${USERPROFILE:-}" ] && command -v wslpath >/dev/null 2>&1; then
        candidate="$(wslpath "$USERPROFILE" 2>/dev/null || true)/.ssh/$KEY_FILE_NAME"
        if [ -f "$candidate" ]; then
            echo "$candidate"
            return
        fi
    fi

    if [ -n "${USERPROFILE:-}" ] && command -v cygpath >/dev/null 2>&1; then
        candidate="$(cygpath -u "$USERPROFILE" 2>/dev/null || true)/.ssh/$KEY_FILE_NAME"
        if [ -f "$candidate" ]; then
            echo "$candidate"
            return
        fi
    fi

    if [ -d "/mnt/c/Users" ]; then
        for match in /mnt/c/Users/*/.ssh/"$KEY_FILE_NAME"; do
            if [ -f "$match" ]; then
                echo "$match"
                return
            fi
        done
    fi

    echo ""
}

if [ -z "$KEY_PATH" ]; then
    if [ -f "$HOME/.ssh/$KEY_FILE_NAME" ]; then
        KEY_PATH="$HOME/.ssh/$KEY_FILE_NAME"
    else
        KEY_PATH="$(resolve_windows_profile_ssh_path)"
    fi
fi

if [ -n "$KEY_PATH" ] && [ ! -f "$KEY_PATH" ] && command -v cygpath >/dev/null 2>&1; then
    WINDOWS_KEY_PATH=$(cygpath -u "$KEY_PATH" 2>/dev/null || true)
    if [ -n "$WINDOWS_KEY_PATH" ] && [ -f "$WINDOWS_KEY_PATH" ]; then
        KEY_PATH="$WINDOWS_KEY_PATH"
    fi
fi

if [ -n "$KEY_PATH" ] && [ ! -f "$KEY_PATH" ] && command -v wslpath >/dev/null 2>&1; then
    WINDOWS_KEY_PATH=$(wslpath "$KEY_PATH" 2>/dev/null || true)
    if [ -n "$WINDOWS_KEY_PATH" ] && [ -f "$WINDOWS_KEY_PATH" ]; then
        KEY_PATH="$WINDOWS_KEY_PATH"
    fi
fi

if [ ! -f "$KEY_PATH" ]; then
    echo "SSH key not found at ${KEY_PATH:-<empty>}"
    echo "Looked for:"
    echo "  - SSH_KEY_PATH (if set)"
    echo "  - $HOME/.ssh/$KEY_FILE_NAME"
    echo "  - %USERPROFILE%/.ssh/$KEY_FILE_NAME (WSL/Git Bash translated path)"
    echo "Set SSH_KEY_PATH explicitly if your key is elsewhere."
    exit 1
fi

KEY_PATH_SOURCE="$KEY_PATH"
KEY_PATH_TMP=""

if [[ "$KEY_PATH_SOURCE" == /mnt/* ]]; then
    KEY_PATH_TMP=$(mktemp)
    cp "$KEY_PATH_SOURCE" "$KEY_PATH_TMP"
    chmod 600 "$KEY_PATH_TMP"
    KEY_PATH="$KEY_PATH_TMP"
    trap 'rm -f "$KEY_PATH_TMP"' EXIT
fi

if [ -z "$EC2_IP" ]; then
    echo "Usage: bash infra/deploy.sh <EC2_PUBLIC_IP>"
    exit 1
fi

mkdir -p "$(dirname "$SSH_KNOWN_HOSTS_FILE")"
touch "$SSH_KNOWN_HOSTS_FILE"
chmod 600 "$SSH_KNOWN_HOSTS_FILE" 2>/dev/null || true

if [ "$SSH_STRICT_HOST_KEY_CHECKING" = "yes" ]; then
    SSH_HOSTKEY_OPTS="-o StrictHostKeyChecking=yes"
else
    SSH_HOSTKEY_OPTS="-o StrictHostKeyChecking=accept-new"
    echo "WARNING: SSH_STRICT_HOST_KEY_CHECKING is not 'yes'. Host key trust-on-first-use is enabled."
fi

SSH_COMMON_OPTS="-o BatchMode=yes -o ConnectTimeout=10 -o UserKnownHostsFile=$SSH_KNOWN_HOSTS_FILE $SSH_HOSTKEY_OPTS"

echo "========================================="
echo "  SynthFlow Deployment"
echo "  Target: $EC2_USER@$EC2_IP"
echo "  SSH key: $KEY_PATH"
echo "  SSH strict host key checking: $SSH_STRICT_HOST_KEY_CHECKING"
echo "========================================="

echo ""
echo ">>> Step 0: SSH preflight check..."
if ! ssh $SSH_COMMON_OPTS -i "$KEY_PATH" "$EC2_USER@$EC2_IP" "echo preflight_ok" >/dev/null 2>&1; then
    echo "SSH preflight failed for $EC2_USER@$EC2_IP using key $KEY_PATH"
    if [ "$SSH_STRICT_HOST_KEY_CHECKING" = "yes" ]; then
        echo "Host key verification failed or host key is unknown."
        echo "Verify the host key fingerprint out-of-band, then add it to known_hosts:"
        echo "  ssh-keyscan -H $EC2_IP >> $SSH_KNOWN_HOSTS_FILE"
    fi
    echo "Verify EC2_USER, key pair, and that the public key is present in ~/.ssh/authorized_keys on the instance."
    exit 1
fi

# Step 1: Sync project files to EC2
echo ""
echo ">>> Step 1: Syncing project files..."
ssh $SSH_COMMON_OPTS -i "$KEY_PATH" "$EC2_USER@$EC2_IP" "mkdir -p $REMOTE_DIR"

# Use rsync if available, fallback to scp
if command -v rsync &> /dev/null; then
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '.venv' \
        --exclude '__pycache__' \
        --exclude '.git' \
        --exclude 'artifacts' \
        --exclude '*.pyc' \
        --exclude '.env' \
        --exclude '.env.local' \
        --exclude '.env.production' \
        -e "ssh $SSH_COMMON_OPTS -i $KEY_PATH" \
        ./ "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
else
    echo "rsync not found, using scp (slower)..."
    scp $SSH_COMMON_OPTS -i "$KEY_PATH" -r \
        backend/ frontend/ infra/ docker-compose.yml \
        "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
fi

# Step 2: Copy production env file
echo ""
echo ">>> Step 2: Copying production environment file..."
if [ -f ".env.production" ]; then
    scp $SSH_COMMON_OPTS -i "$KEY_PATH" .env.production "$EC2_USER@$EC2_IP:$REMOTE_DIR/.env.production"
else
    echo "WARNING: .env.production not found! Create it before deploying."
    echo "Copy from infra/.env.production.example and fill in values."
    exit 1
fi

# Step 3: Build and start on EC2
echo ""
echo ">>> Step 3: Building and starting services on EC2..."
ssh $SSH_COMMON_OPTS -i "$KEY_PATH" "$EC2_USER@$EC2_IP" << 'REMOTE_SCRIPT'
    cd ~/synthflow

    sed -i 's/\r$//' ./.env.production
    set -a
    . ./.env.production
    set +a

    # Render SSL config from template so domain/cert names come from env.
    NGINX_SERVER_NAME="${NGINX_SERVER_NAME:-}"
    if [ -z "$NGINX_SERVER_NAME" ] && [ -n "${FRONTEND_URL:-}" ]; then
        NGINX_SERVER_NAME=$(printf '%s' "$FRONTEND_URL" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')
    fi
    if [ -z "$NGINX_SERVER_NAME" ] && [ -n "${BACKEND_URL:-}" ]; then
        NGINX_SERVER_NAME=$(printf '%s' "$BACKEND_URL" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')
    fi
    NGINX_SERVER_NAME="${NGINX_SERVER_NAME:-localhost}"
    LETSENCRYPT_CERT_NAME="${LETSENCRYPT_CERT_NAME:-$NGINX_SERVER_NAME}"

    if [ -f infra/nginx/conf.d/ssl.conf.template ]; then
        sed \
            -e "s#__NGINX_SERVER_NAME__#$NGINX_SERVER_NAME#g" \
            -e "s#__LETSENCRYPT_CERT_NAME__#$LETSENCRYPT_CERT_NAME#g" \
            infra/nginx/conf.d/ssl.conf.template > infra/nginx/conf.d/ssl.conf
    fi

    echo "--- Stopping existing containers ---"
    cd infra
    docker compose -f docker-compose.prod.yml down 2>/dev/null || true

    echo "--- Cleaning Docker cache ---"
    docker builder prune -f --filter until=24h >/dev/null 2>&1 || true
    docker image prune -f >/dev/null 2>&1 || true

    echo "--- Building containers ---"
    docker compose -f docker-compose.prod.yml build --no-cache

    echo "--- Starting containers ---"
    docker compose -f docker-compose.prod.yml up -d

    echo "--- Waiting for services to start ---"
    for attempt in $(seq 1 30); do
        if curl -fsS http://localhost:8000/api/health >/dev/null; then
            break
        fi

        if [ "$attempt" -eq 30 ]; then
            echo "API did not become healthy in time"
            docker compose -f docker-compose.prod.yml ps
            exit 1
        fi

        sleep 2
    done

    echo "--- Running database migrations ---"
    docker exec synthflow-api alembic upgrade head

    echo "--- Container status ---"
    docker compose -f docker-compose.prod.yml ps

    echo "--- Health check ---"
    curl -s http://localhost:8000/api/health || echo "API not ready yet"

    echo ""
    echo "Deployment complete!"
REMOTE_SCRIPT

echo ""
echo "========================================="
echo "  Deployment finished!"
echo "  URL: http://$EC2_IP"
echo "========================================="
