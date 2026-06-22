#!/bin/bash
set -e

echo "🗑️ Uninstalling BanriFlow..."

# Remove the executable
if [ -f "/usr/local/bin/banri" ]; then
    if [ "$EUID" -ne 0 ]; then
        echo "🔑 Sudo permission required to remove /usr/local/bin/banri"
        sudo rm -f /usr/local/bin/banri
    else
        rm -f /usr/local/bin/banri
    fi
    echo "✅ BanriFlow executable removed from /usr/local/bin."
else
    echo "⚠️ BanriFlow executable not found in /usr/local/bin."
fi

# Ask to remove config
if [ -f "$HOME/.banriflow.env" ]; then
    read -p "❓ Do you want to delete your API keys and configuration (~/.banriflow.env)? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -f "$HOME/.banriflow.env"
        echo "✅ Configuration removed."
    else
        echo "ℹ️ Configuration kept."
    fi
fi

echo "👋 BanriFlow has been successfully uninstalled."
