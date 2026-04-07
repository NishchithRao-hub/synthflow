#!/bin/bash
# infra/deploy.sh
# Deploy SynthFlow to EC2
# Usage: bash infra/deploy.sh <EC2_PUBLIC_IP>

set -e

EC2_IP=$1
EC2_USER="ec2-user"
KEY_PATH="$HOME/.ssh/synthflow-key.pem"
REMOTE_DIR="/home/ec2-user/synthflow"

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

    echo "--- Stopping existing containers ---"
    cd infra
    docker compose -f docker-compose.prod.yml down 2>/dev/null || true

    echo "--- Building containers ---"
    docker compose -f docker-compose.prod.yml build --no-cache

    echo "--- Starting containers ---"
    docker compose -f docker-compose.prod.yml up -d

    echo "--- Waiting for services to start ---"
    sleep 15

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
