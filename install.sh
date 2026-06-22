#!/bin/bash
set -e

echo "🌊 Installing BanriFlow..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Error: Go is not installed. BanriFlow requires Go to build."
    echo "👉 Please install Go first: https://go.dev/dl/"
    exit 1
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Error: Git is not installed."
    exit 1
fi

TMP_DIR=$(mktemp -d)
cd $TMP_DIR

echo "📦 Cloning BanriFlow repository..."
git clone --quiet https://github.com/thebanri/BanriFlow.git .

echo "🔨 Building BanriFlow..."
go build -o banri main.go

echo "🚀 Installing to /usr/local/bin/banri..."
if [ "$EUID" -ne 0 ]; then
    echo "🔑 Sudo permission may be required to move the binary to /usr/local/bin"
    sudo mv banri /usr/local/bin/
else
    mv banri /usr/local/bin/
fi

cd - > /dev/null
rm -rf $TMP_DIR

echo ""
echo "✅ Installation complete! You can now use the 'banri' command anywhere."
echo "👉 Get started by configuring your AI Provider:"
echo "   banri set"
