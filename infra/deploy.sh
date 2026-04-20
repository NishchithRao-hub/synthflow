#!/bin/bash
# infra/deploy.sh
# Deploy SynthFlow to EC2
# Usage: bash infra/deploy.sh <EC2_PUBLIC_IP>

set -e

EC2_IP=$1
EC2_USER="${EC2_USER:-ec2-user}"
KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/synthflow-key.pem}"
REMOTE_DIR="${REMOTE_DIR:-/home/$EC2_USER/synthflow}"

if [ ! -f "$KEY_PATH" ] && command -v cygpath >/dev/null 2>&1; then
    WINDOWS_KEY_PATH=$(cygpath -u "$KEY_PATH" 2>/dev/null || true)
    if [ -n "$WINDOWS_KEY_PATH" ] && [ -f "$WINDOWS_KEY_PATH" ]; then
        KEY_PATH="$WINDOWS_KEY_PATH"
    fi
fi

if [ ! -f "$KEY_PATH" ] && command -v wslpath >/dev/null 2>&1; then
    WINDOWS_KEY_PATH=$(wslpath "$KEY_PATH" 2>/dev/null || true)
    if [ -n "$WINDOWS_KEY_PATH" ] && [ -f "$WINDOWS_KEY_PATH" ]; then
        KEY_PATH="$WINDOWS_KEY_PATH"
    fi
fi

if [ ! -f "$KEY_PATH" ]; then
    echo "SSH key not found at $KEY_PATH"
    echo "Set SSH_KEY_PATH to the correct private key location on this machine before deploying."
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

echo "========================================="
echo "  SynthFlow Deployment"
echo "  Target: $EC2_USER@$EC2_IP"
echo "========================================="

# Step 1: Sync project files to EC2
echo ""
echo ">>> Step 1: Syncing project files..."
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_IP" "mkdir -p $REMOTE_DIR"

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
        -e "ssh -i $KEY_PATH" \
        ./ "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
else
    echo "rsync not found, using scp (slower)..."
    scp -i "$KEY_PATH" -r \
        backend/ frontend/ infra/ docker-compose.yml \
        "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
fi

# Step 2: Copy production env file
echo ""
echo ">>> Step 2: Copying production environment file..."
if [ -f ".env.production" ]; then
    scp -i "$KEY_PATH" .env.production "$EC2_USER@$EC2_IP:$REMOTE_DIR/.env.production"
else
    echo "WARNING: .env.production not found! Create it before deploying."
    echo "Copy from infra/.env.production.example and fill in values."
    exit 1
fi

# Step 3: Build and start on EC2
echo ""
echo ">>> Step 3: Building and starting services on EC2..."
ssh -i "$KEY_PATH" "$EC2_USER@$EC2_IP" << 'REMOTE_SCRIPT'
    cd ~/synthflow

    sed -i 's/\r$//' ./.env.production
    set -a
    . ./.env.production
    set +a

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
