#!/usr/bin/env bash
#
# Claude Code Anywhere - Uninstall Script
# Uses manifest to safely remove only what was installed
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Installation paths
INSTALL_ROOT="$HOME/.claude-code-anywhere"
MANIFEST_FILE="$INSTALL_ROOT/manifest.json"

# Markers for rc file modification
RC_MARKER_START="# --- claude-code-anywhere ---"
RC_MARKER_END="# --- end claude-code-anywhere ---"

echo -e "${CYAN}╭────────────────────────────────────────────────╮${NC}"
echo -e "${CYAN}│   Claude Code Anywhere - Uninstall Script      │${NC}"
echo -e "${CYAN}╰────────────────────────────────────────────────╯${NC}"
echo ""

# Check if manifest exists
if [ ! -f "$MANIFEST_FILE" ]; then
    echo -e "${RED}❌ No installation manifest found at $MANIFEST_FILE${NC}"
    echo ""
    echo "This could mean:"
    echo "  1. Claude Code Anywhere was never installed"
    echo "  2. It was installed with an older version"
    echo ""
    echo -e "${YELLOW}Would you like to force uninstall anyway? (y/N)${NC}"
    read -r force_uninstall

    if [[ ! "$force_uninstall" =~ ^[Yy]$ ]]; then
        echo "Aborting uninstall."
        exit 1
    fi

    # Create a minimal manifest for force uninstall
    echo '{"service_type": "unknown", "rc_files_modified": [".zshrc", ".bashrc"]}' > "$MANIFEST_FILE"
fi

# Read manifest
echo -e "${YELLOW}→ Reading installation manifest...${NC}"
MANIFEST=$(cat "$MANIFEST_FILE")
echo -e "${GREEN}  ✓ Manifest loaded${NC}"

# Stop and remove service
stop_service() {
    local service_type
    service_type=$(echo "$MANIFEST" | jq -r '.service_type // "unknown"')

    echo -e "${YELLOW}→ Stopping notification service...${NC}"

    if [ "$service_type" = "launchd" ]; then
        local plist_file="$HOME/Library/LaunchAgents/com.claude.code-anywhere.plist"
        if [ -f "$plist_file" ]; then
            launchctl unload "$plist_file" 2>/dev/null || true
            rm -f "$plist_file"
            echo -e "${GREEN}  ✓ launchd service stopped and removed${NC}"
        else
            echo -e "${CYAN}  ○ launchd plist not found (already removed?)${NC}"
        fi
    elif [ "$service_type" = "systemd" ]; then
        systemctl --user stop claude-code-anywhere.service 2>/dev/null || true
        systemctl --user disable claude-code-anywhere.service 2>/dev/null || true
        rm -f "$HOME/.config/systemd/user/claude-code-anywhere.service"
        systemctl --user daemon-reload 2>/dev/null || true
        echo -e "${GREEN}  ✓ systemd service stopped and removed${NC}"
    else
        # Try both just in case
        if [ -f "$HOME/Library/LaunchAgents/com.claude.code-anywhere.plist" ]; then
            launchctl unload "$HOME/Library/LaunchAgents/com.claude.code-anywhere.plist" 2>/dev/null || true
            rm -f "$HOME/Library/LaunchAgents/com.claude.code-anywhere.plist"
            echo -e "${GREEN}  ✓ launchd service removed${NC}"
        fi
        if [ -f "$HOME/.config/systemd/user/claude-code-anywhere.service" ]; then
            systemctl --user stop claude-code-anywhere.service 2>/dev/null || true
            systemctl --user disable claude-code-anywhere.service 2>/dev/null || true
            rm -f "$HOME/.config/systemd/user/claude-code-anywhere.service"
            echo -e "${GREEN}  ✓ systemd service removed${NC}"
        fi
    fi
}

# Remove PATH from rc files
remove_path_config() {
    echo -e "${YELLOW}→ Removing PATH configuration...${NC}"

    local rc_files=("$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile")

    for rc_file in "${rc_files[@]}"; do
        if [ -f "$rc_file" ] && grep -q "$RC_MARKER_START" "$rc_file"; then
            # Use sed to remove the block between markers (inclusive)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "/$RC_MARKER_START/,/$RC_MARKER_END/d" "$rc_file"
            else
                sed -i "/$RC_MARKER_START/,/$RC_MARKER_END/d" "$rc_file"
            fi
            # Remove any trailing empty lines we may have left
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' -e :a -e '/^\n*$/{$d;N;ba' -e '}' "$rc_file" 2>/dev/null || true
            fi
            echo -e "${GREEN}  ✓ Removed from: $rc_file${NC}"
        fi
    done
}

# Remove installation directory
remove_install_dir() {
    echo -e "${YELLOW}→ Removing installation directory...${NC}"

    if [ -d "$INSTALL_ROOT" ]; then
        # Preserve .env if user wants
        if [ -f "$INSTALL_ROOT/plugins/claude-code-anywhere/.env" ]; then
            echo -e "${YELLOW}  ⚠ Found .env configuration file${NC}"
            echo -e "  Save a backup to ~/.claude-code-anywhere-env.backup? (y/N)"
            read -r save_env
            if [[ "$save_env" =~ ^[Yy]$ ]]; then
                cp "$INSTALL_ROOT/plugins/claude-code-anywhere/.env" "$HOME/.claude-code-anywhere-env.backup"
                echo -e "${GREEN}  ✓ Saved .env backup to ~/.claude-code-anywhere-env.backup${NC}"
            fi
        fi

        rm -rf "$INSTALL_ROOT"
        echo -e "${GREEN}  ✓ Removed $INSTALL_ROOT${NC}"
    else
        echo -e "${CYAN}  ○ Installation directory not found (already removed?)${NC}"
    fi
}

# Main uninstall flow
main() {
    echo -e "${YELLOW}This will remove Claude Code Anywhere from your system.${NC}"
    echo ""
    echo "The following will be removed:"
    echo "  • Shim at ~/.claude-code-anywhere/bin/claude"
    echo "  • Plugin at ~/.claude-code-anywhere/plugins/"
    echo "  • PATH configuration from shell rc files"
    echo "  • Background notification service"
    echo ""
    echo -e "${YELLOW}Continue with uninstall? (y/N)${NC}"
    read -r confirm

    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Aborting uninstall."
        exit 0
    fi

    echo ""

    # Stop service first
    stop_service

    # Remove PATH config
    remove_path_config

    # Remove installation directory
    remove_install_dir

    echo ""
    echo -e "${GREEN}╭────────────────────────────────────────────────╮${NC}"
    echo -e "${GREEN}│         Uninstall Complete! 👋                 │${NC}"
    echo -e "${GREEN}╰────────────────────────────────────────────────╯${NC}"
    echo ""
    echo -e "${CYAN}Notes:${NC}"
    echo "  • Restart your shell to update PATH"
    echo "  • The original 'claude' CLI is still available"
    echo ""
    if [ -f "$HOME/.claude-code-anywhere-env.backup" ]; then
        echo "  • Your .env backup is at: ~/.claude-code-anywhere-env.backup"
        echo ""
    fi
    echo "Thanks for trying Claude Code Anywhere!"
    echo ""
}

# Run main
main "$@"
