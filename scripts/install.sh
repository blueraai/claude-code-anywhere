#!/usr/bin/env bash
#
# Claude Code Anywhere - Install Script
# Creates a PATH shim to ensure all Claude sessions load the notification plugin
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
SHIM_DIR="$INSTALL_ROOT/bin"
PLUGIN_DIR="$INSTALL_ROOT/plugins/claude-code-anywhere"
MANIFEST_FILE="$INSTALL_ROOT/manifest.json"

# Markers for rc file modification
RC_MARKER_START="# --- claude-code-anywhere ---"
RC_MARKER_END="# --- end claude-code-anywhere ---"

# Detect script location (where the repo is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}╭────────────────────────────────────────────────╮${NC}"
echo -e "${CYAN}│   Claude Code Anywhere - Installation Script   │${NC}"
echo -e "${CYAN}╰────────────────────────────────────────────────╯${NC}"
echo ""

# Check for required dependencies
check_dependencies() {
    local missing=()

    command -v bun >/dev/null 2>&1 || missing+=("bun")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    command -v curl >/dev/null 2>&1 || missing+=("curl")

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing required dependencies: ${missing[*]}${NC}"
        echo "Please install them first:"
        echo "  brew install ${missing[*]}"
        exit 1
    fi
}

# Find the real claude binary
# See: https://code.claude.com/docs/en/setup
find_real_claude() {
    local shim_path="$SHIM_DIR/claude"

    # First try: use 'which -a' to find all claude binaries
    while IFS= read -r path; do
        if [ -x "$path" ] && [ "$path" != "$shim_path" ]; then
            echo "$path"
            return 0
        fi
    done < <(which -a claude 2>/dev/null || true)

    # Second try: check common locations
    # - ~/.local/bin/claude       Native binary (official, documented)
    # - ~/.claude/local/claude    npm wrapper (legacy installs)
    # - Homebrew and npm-global paths
    for path in "$HOME/.local/bin/claude" "$HOME/.claude/local/claude" /usr/local/bin/claude /opt/homebrew/bin/claude "$HOME/.npm-global/bin/claude"; do
        if [ -x "$path" ] && [ "$path" != "$shim_path" ]; then
            echo "$path"
            return 0
        fi
    done

    return 1
}

# Create the shim executable
create_shim() {
    echo -e "${YELLOW}→ Creating shim executable...${NC}"

    mkdir -p "$SHIM_DIR"

    cat > "$SHIM_DIR/claude" << 'SHIM_EOF'
#!/usr/bin/env bash
#
# Claude Code Anywhere Shim
# Intercepts 'claude' and adds --plugin-dir for notifications
#

PLUGIN_DIR="$HOME/.claude-code-anywhere/plugins"
MY_PATH="$HOME/.claude-code-anywhere/bin/claude"

# Find the REAL claude binary (excluding ourselves)
find_real_claude() {
    while IFS= read -r path; do
        if [ -x "$path" ] && [ "$path" != "$MY_PATH" ]; then
            echo "$path"
            return 0
        fi
    done < <(which -a claude 2>/dev/null || true)

    # Fallback: check common locations
    # See: https://code.claude.com/docs/en/setup
    for path in "$HOME/.local/bin/claude" "$HOME/.claude/local/claude" /usr/local/bin/claude /opt/homebrew/bin/claude "$HOME/.npm-global/bin/claude"; do
        if [ -x "$path" ] && [ "$path" != "$MY_PATH" ]; then
            echo "$path"
            return 0
        fi
    done

    return 1
}

REAL_CLAUDE=$(find_real_claude)

if [ -z "$REAL_CLAUDE" ]; then
    echo "❌ Error: Could not find the original 'claude' CLI."
    echo "Please ensure Claude Code is installed."
    exit 1
fi

# Pass through with plugin-dir (only add if not already specified)
if [[ "$*" == *"--plugin-dir"* ]]; then
    exec "$REAL_CLAUDE" "$@"
else
    exec "$REAL_CLAUDE" --plugin-dir "$PLUGIN_DIR" "$@"
fi
SHIM_EOF

    chmod +x "$SHIM_DIR/claude"
    echo -e "${GREEN}  ✓ Shim created at $SHIM_DIR/claude${NC}"
}

# Copy plugin files to installation directory
install_plugin() {
    echo -e "${YELLOW}→ Installing plugin...${NC}"

    if [ ! -f "$REPO_DIR/plugin.json" ]; then
        echo -e "${RED}❌ Error: plugin.json not found in $REPO_DIR${NC}"
        echo "Please run this script from the claude-code-anywhere repository."
        exit 1
    fi

    # Create plugin directory
    mkdir -p "$PLUGIN_DIR"

    # Copy essential plugin files
    cp -r "$REPO_DIR/plugin.json" "$PLUGIN_DIR/"
    cp -r "$REPO_DIR/hooks" "$PLUGIN_DIR/"
    cp -r "$REPO_DIR/commands" "$PLUGIN_DIR/"
    cp -r "$REPO_DIR/skills" "$PLUGIN_DIR/"
    cp -r "$REPO_DIR/dist" "$PLUGIN_DIR/"
    cp -r "$REPO_DIR/src" "$PLUGIN_DIR/"
    cp "$REPO_DIR/package.json" "$PLUGIN_DIR/"
    cp "$REPO_DIR/tsconfig.json" "$PLUGIN_DIR/"

    # Copy node_modules for runtime
    if [ -d "$REPO_DIR/node_modules" ]; then
        cp -r "$REPO_DIR/node_modules" "$PLUGIN_DIR/"
    else
        echo -e "${YELLOW}  ⚠ node_modules not found, running bun install...${NC}"
        (cd "$PLUGIN_DIR" && bun install --production)
    fi

    # Copy .env if it exists (user config)
    if [ -f "$REPO_DIR/.env" ]; then
        cp "$REPO_DIR/.env" "$PLUGIN_DIR/"
        chmod 600 "$PLUGIN_DIR/.env"
    elif [ -f "$REPO_DIR/.env.example" ]; then
        cp "$REPO_DIR/.env.example" "$PLUGIN_DIR/.env"
        chmod 600 "$PLUGIN_DIR/.env"
        echo -e "${YELLOW}  ⚠ Created .env from .env.example - please configure it${NC}"
    fi

    echo -e "${GREEN}  ✓ Plugin installed to $PLUGIN_DIR${NC}"
}

# Add PATH to shell rc files
configure_path() {
    echo -e "${YELLOW}→ Configuring PATH...${NC}"

    local rc_files=()
    local modified_files=()

    # Detect which rc files exist
    [ -f "$HOME/.zshrc" ] && rc_files+=("$HOME/.zshrc")
    [ -f "$HOME/.bashrc" ] && rc_files+=("$HOME/.bashrc")
    [ -f "$HOME/.bash_profile" ] && rc_files+=("$HOME/.bash_profile")

    # Create .zshrc if no rc files exist and user has zsh
    if [ ${#rc_files[@]} -eq 0 ]; then
        if [ "$SHELL" = "/bin/zsh" ] || [ "$SHELL" = "/usr/bin/zsh" ]; then
            touch "$HOME/.zshrc"
            rc_files+=("$HOME/.zshrc")
        else
            touch "$HOME/.bashrc"
            rc_files+=("$HOME/.bashrc")
        fi
    fi

    local path_block="$RC_MARKER_START
export PATH=\"\$HOME/.claude-code-anywhere/bin:\$PATH\"
$RC_MARKER_END"

    for rc_file in "${rc_files[@]}"; do
        # Skip if already configured
        if grep -q "$RC_MARKER_START" "$rc_file" 2>/dev/null; then
            echo -e "  ${CYAN}○ Already configured: $rc_file${NC}"
            continue
        fi

        # Add PATH configuration
        echo "" >> "$rc_file"
        echo "$path_block" >> "$rc_file"
        modified_files+=("$(basename "$rc_file")")
        echo -e "${GREEN}  ✓ Updated: $rc_file${NC}"
    done

    echo "${modified_files[*]}"
}

# Install launchd service (macOS)
install_launchd_service() {
    echo -e "${YELLOW}→ Installing launchd service...${NC}"

    local plist_dir="$HOME/Library/LaunchAgents"
    local plist_file="$plist_dir/com.claude.code-anywhere.plist"
    mkdir -p "$plist_dir"

    # Find bun path
    local bun_path
    bun_path=$(which bun)

    cat > "$plist_file" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.code-anywhere</string>
    <key>ProgramArguments</key>
    <array>
        <string>$bun_path</string>
        <string>run</string>
        <string>server</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PLUGIN_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
PLIST_EOF

    # Load the service
    launchctl unload "$plist_file" 2>/dev/null || true
    launchctl load "$plist_file"

    echo -e "${GREEN}  ✓ launchd service installed and started${NC}"
    echo "$plist_file"
}

# Install systemd service (Linux)
install_systemd_service() {
    echo -e "${YELLOW}→ Installing systemd user service...${NC}"

    local service_dir="$HOME/.config/systemd/user"
    local service_file="$service_dir/claude-code-anywhere.service"

    mkdir -p "$service_dir"

    # Find bun path
    local bun_path
    bun_path=$(which bun)

    cat > "$service_file" << SERVICE_EOF
[Unit]
Description=Claude Code Anywhere Notification Server
After=network.target

[Service]
Type=simple
ExecStart=$bun_path run server
WorkingDirectory=$PLUGIN_DIR
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
SERVICE_EOF

    # Enable and start the service
    systemctl --user daemon-reload
    systemctl --user enable claude-code-anywhere.service
    systemctl --user start claude-code-anywhere.service

    echo -e "${GREEN}  ✓ systemd user service installed and started${NC}"
    echo "$service_file"
}

# Write installation manifest
write_manifest() {
    local modified_rc_files="$1"
    local service_type="$2"
    local service_path="$3"

    echo -e "${YELLOW}→ Writing installation manifest...${NC}"

    cat > "$MANIFEST_FILE" << MANIFEST_EOF
{
  "version": "$(jq -r '.version' "$REPO_DIR/plugin.json")",
  "installed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "shim_path": "$SHIM_DIR/claude",
  "plugin_path": "$PLUGIN_DIR",
  "rc_files_modified": [$(echo "$modified_rc_files" | tr ' ' '\n' | sed 's/.*/"&"/' | tr '\n' ',' | sed 's/,$//')],
  "service_type": "$service_type",
  "service_path": "$service_path"
}
MANIFEST_EOF

    echo -e "${GREEN}  ✓ Manifest written to $MANIFEST_FILE${NC}"
}

# Main installation flow
main() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    check_dependencies

    # Check for existing claude CLI
    if ! find_real_claude >/dev/null; then
        echo -e "${RED}❌ Error: Claude Code CLI not found${NC}"
        echo "Please install Claude Code first: https://docs.anthropic.com/claude-code"
        exit 1
    fi

    local real_claude
    real_claude=$(find_real_claude)
    echo -e "${GREEN}✓ Found Claude CLI at: $real_claude${NC}"
    echo ""

    # Create shim
    create_shim

    # Install plugin
    install_plugin

    # Configure PATH
    local modified_files
    modified_files=$(configure_path)

    # Install service based on OS
    local service_type=""
    local service_path=""

    if [[ "$OSTYPE" == "darwin"* ]]; then
        service_type="launchd"
        service_path=$(install_launchd_service)
    elif [[ "$OSTYPE" == "linux"* ]]; then
        service_type="systemd"
        service_path=$(install_systemd_service)
    else
        echo -e "${YELLOW}⚠ Unsupported OS for automatic service installation${NC}"
        echo "  Please manually start the server: cd $PLUGIN_DIR && bun run server"
        service_type="none"
        service_path=""
    fi

    # Write manifest
    write_manifest "$modified_files" "$service_type" "$service_path"

    # Clear the "shown install message" marker so fresh installs see updated messages
    local config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/claude-code-anywhere"
    rm -f "$config_dir/shown-install-message" 2>/dev/null || true

    echo ""
    echo -e "${GREEN}╭────────────────────────────────────────────────╮${NC}"
    echo -e "${GREEN}│         Installation Complete! 🎉              │${NC}"
    echo -e "${GREEN}╰────────────────────────────────────────────────╯${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo ""
    echo "  1. Restart your shell or run:"
    echo -e "     ${YELLOW}source ~/.zshrc${NC}  (or ~/.bashrc)"
    echo ""
    echo "  2. Verify the shim is active:"
    echo -e "     ${YELLOW}which claude${NC}"
    echo "     Should show: ~/.claude-code-anywhere/bin/claude"
    echo ""
    echo "  3. Configure your notification channels:"
    echo -e "     ${YELLOW}vi $PLUGIN_DIR/.env${NC}"
    echo ""
    echo "  4. Test in any Claude Code session:"
    echo -e "     ${YELLOW}/notify-test${NC}"
    echo ""
    echo "  5. Diagnose any issues:"
    echo -e "     ${YELLOW}/notify-doctor${NC}"
    echo ""
    echo -e "${CYAN}To uninstall:${NC}"
    echo -e "  ${YELLOW}bash $PLUGIN_DIR/scripts/uninstall.sh${NC}"
    echo ""
}

# Run main
main "$@"
