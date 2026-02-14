#!/bin/bash

set -euo pipefail

# Check for required dependencies
for cmd in git jq curl pbcopy osascript; do
    command -v "$cmd" >/dev/null 2>&1 || { echo "Error: Required command '$cmd' not found. Please install it first."; exit 1; }
done

# --- CONFIGURATION ---
JIRA_DOMAIN=$JIRA_DOMAIN
EMAIL=$JIRA_EMAIL
API_TOKEN=$JIRA_API_TOKEN

# Validate Jira credentials
if [ -z "$JIRA_DOMAIN" ] || [ -z "$EMAIL" ] || [ -z "$API_TOKEN" ]; then
    echo "Error: Missing Jira credentials. Please set JIRA_DOMAIN, JIRA_EMAIL, and JIRA_API_TOKEN environment variables."
    exit 1
fi

# --- DEFAULTS (overridable via .worktree.conf) ---
BASE_BRANCH="develop"
WORKTREES_DIR="Worktrees"
COPY_FILES=()
COPY_DIRS=()
CLAUDE_MODE="--permission-mode plan"
TERMINAL="warp"  # warp | iterm | terminal

# --- INPUT ---
ISSUE_KEY=""
PROJECT_PATH=""

usage() {
    echo "Usage: ticket_to_claude_worktree [-p /path/to/project] TICKET-123"
    echo ""
    echo "Options:"
    echo "  -p PATH   Path to the git project (default: current directory)"
    echo ""
    echo "Configuration:"
    echo "  Place a .worktree.conf file in your project root to customize behavior."
    echo ""
    echo "  Example .worktree.conf:"
    echo "    BASE_BRANCH=main"
    echo "    WORKTREES_DIR=../Worktrees"
    echo "    COPY_FILES=(local.properties app/google-services.json)"
    echo "    COPY_DIRS=(keystores .gradle)"
    echo "    TERMINAL=iterm"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            if [ -z "${2:-}" ] || [[ "${2:-}" == -* ]]; then
                echo "Error: -p requires a path argument."
                exit 1
            fi
            PROJECT_PATH="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            ISSUE_KEY="$1"
            shift
            ;;
    esac
done

if [ -z "$ISSUE_KEY" ]; then
    usage
fi

# Resolve project path
if [ -z "$PROJECT_PATH" ]; then
    PROJECT_PATH=$(git rev-parse --show-toplevel 2>/dev/null)
    if [ -z "$PROJECT_PATH" ]; then
        echo "Error: Not inside a git repository. Use -p to specify the project path."
        exit 1
    fi
fi

PROJECT_PATH=$(cd "$PROJECT_PATH" && pwd)  # resolve to absolute path

if [ ! -d "$PROJECT_PATH/.git" ] && [ ! -f "$PROJECT_PATH/.git" ]; then
    echo "Error: $PROJECT_PATH is not a git repository."
    exit 1
fi

# --- LOAD PROJECT CONFIG ---
CONF_FILE="$PROJECT_PATH/.worktree.conf"
if [ -f "$CONF_FILE" ]; then
    echo "Loading config from $CONF_FILE"
    source "$CONF_FILE"
fi

# Resolve worktrees root (relative to project parent, or absolute)
if [[ "$WORKTREES_DIR" == /* ]]; then
    WORKTREES_ROOT="$WORKTREES_DIR"
else
    WORKTREES_ROOT="$(dirname "$PROJECT_PATH")/$WORKTREES_DIR"
fi

# --- 1. FETCH JIRA TICKET ---
echo "Fetching Jira ticket $ISSUE_KEY..."
AUTH=$(printf '%s' "$EMAIL:$API_TOKEN" | base64)

# Fetch ticket with HTTP status check
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/jira_response_$$.json \
     -H "Authorization: Basic $AUTH" \
     -H "Content-Type: application/json" \
     "https://$JIRA_DOMAIN/rest/api/3/issue/$ISSUE_KEY")

if [ "$HTTP_CODE" -ne 200 ]; then
    echo "Error: Failed to fetch ticket $ISSUE_KEY (HTTP $HTTP_CODE)"
    cat /tmp/jira_response_$$.json
    rm -f /tmp/jira_response_$$.json
    exit 1
fi

RESPONSE=$(cat /tmp/jira_response_$$.json)
rm -f /tmp/jira_response_$$.json

TITLE=$(echo "$RESPONSE" | jq -r '.fields.summary')
DESC=$(echo "$RESPONSE" | jq -r '
  [.fields.description // empty | recurse(.content[]?) | select(.type == "text") | .text]
  | if length > 0 then join("\n") else "No description provided." end
')

if [ "$TITLE" = "null" ] || [ -z "$TITLE" ]; then
    echo "Error: Could not fetch ticket $ISSUE_KEY"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "   Title: $TITLE"

# --- 2. CREATE WORKTREE ---
# Sanitize title for use in branch name: replace special chars with hyphens, collapse multiple hyphens, trim
SAFE_DESC=$(echo "$TITLE" | sed 's/[^a-zA-Z0-9._-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
# Truncate to 60 characters to avoid excessively long branch names
SAFE_DESC=$(echo "$SAFE_DESC" | cut -c1-60 | sed 's/-$//')
FOLDER_NAME="$ISSUE_KEY"
BRANCH_NAME="${ISSUE_KEY}_${SAFE_DESC}"
TARGET_DIR="$WORKTREES_ROOT/$FOLDER_NAME"

if [ -d "$TARGET_DIR" ]; then
  echo "Error: Directory $TARGET_DIR already exists."
  exit 1
fi

mkdir -p "$WORKTREES_ROOT"

echo "Creating worktree..."
echo "   Folder: $FOLDER_NAME"
echo "   Branch: $BRANCH_NAME"
echo "   Base:   origin/$BASE_BRANCH"

cd "$PROJECT_PATH" || { echo "Error: Cannot access $PROJECT_PATH"; exit 1; }

# Clean up any stale worktree metadata from manually deleted directories
git worktree prune

# Fetch the base branch
git fetch origin "$BASE_BRANCH" || { echo "Error: Could not fetch branch '$BASE_BRANCH' from origin. Check your network and branch name."; exit 1; }

# Check if branch already exists (e.g., from a previously removed worktree)
if git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
    echo "   Branch $BRANCH_NAME already exists, reusing it..."
    git worktree add "$TARGET_DIR" "$BRANCH_NAME" || { echo "Error: Worktree creation failed"; exit 1; }
else
    git worktree add "$TARGET_DIR" "origin/$BASE_BRANCH" -b "$BRANCH_NAME" || { echo "Error: Worktree creation failed"; exit 1; }
fi

cd "$TARGET_DIR" || { echo "Error: Cannot access $TARGET_DIR"; exit 1; }

# Unset upstream to prevent accidental push to wrong branch (suppress error if no upstream set)
git branch --unset-upstream 2>/dev/null || true

# --- 3. COPY CONFIG FILES ---
if [ ${#COPY_FILES[@]} -gt 0 ] || [ ${#COPY_DIRS[@]} -gt 0 ]; then
    echo "Copying project files..."
fi

for file in "${COPY_FILES[@]}"; do
    if [ -f "$PROJECT_PATH/$file" ]; then
        # Ensure target subdirectory exists
        target_dir=$(dirname "$TARGET_DIR/$file")
        mkdir -p "$target_dir"
        cp "$PROJECT_PATH/$file" "$TARGET_DIR/$file"
        echo "   Copied: $file"
    else
        echo "   Warning: $file not found, skipping."
    fi
done

for dir in "${COPY_DIRS[@]}"; do
    if [ -d "$PROJECT_PATH/$dir" ]; then
        cp -r "$PROJECT_PATH/$dir" "$TARGET_DIR/$dir"
        echo "   Copied: $dir/"
    else
        echo "   Warning: $dir/ not found, skipping."
    fi
done

# --- 4. LAUNCH TERMINAL + CLAUDE ---
echo "Opening terminal and launching Claude..."

# Prepare the ticket description for pasting (use %s to avoid format specifier injection)
printf '%s\n\n%s\n\nWhen you'\''re done implementing this, create a pull request using:\ngh pr create --base %s' "[$ISSUE_KEY] $TITLE" "$DESC" "$BASE_BRANCH" | pbcopy

case "$TERMINAL" in
    warp)
        open -a Warp "$TARGET_DIR"
        sleep 1
        osascript -e 'tell application "System Events" to tell process "Warp" to keystroke "claude '"$CLAUDE_MODE"'"' \
                  -e 'tell application "System Events" to tell process "Warp" to keystroke return'
        sleep 5
        osascript -e 'tell application "System Events" to tell process "Warp" to keystroke "v" using command down'
        ;;
    iterm)
        osascript <<EOF
tell application "iTerm"
    activate
    set newWindow to (create window with default profile)
    tell current session of newWindow
        write text "cd '$TARGET_DIR' && claude $CLAUDE_MODE"
    end tell
end tell
EOF
        sleep 5
        osascript -e 'tell application "System Events" to tell process "iTerm2" to keystroke "v" using command down'
        ;;
    terminal)
        osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$TARGET_DIR' && claude $CLAUDE_MODE"
end tell
EOF
        sleep 5
        osascript -e 'tell application "System Events" to tell process "Terminal" to keystroke "v" using command down'
        ;;
    *)
        echo "Unknown terminal: $TERMINAL. Opening default..."
        open "$TARGET_DIR"
        echo "Run manually: cd '$TARGET_DIR' && claude $CLAUDE_MODE"
        echo "Ticket description is in your clipboard (Cmd+V to paste)."
        ;;
esac

echo "Done! Ticket description pasted in Claude (not submitted)."
