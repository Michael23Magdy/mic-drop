#!/bin/bash

# --- CONFIGURATION ---
JIRA_DOMAIN=$JIRA_DOMAIN
EMAIL=$JIRA_EMAIL
API_TOKEN=$JIRA_API_TOKEN

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
AUTH=$(echo -n "$EMAIL:$API_TOKEN" | base64)

RESPONSE=$(curl -s -H "Authorization: Basic $AUTH" \
     -H "Content-Type: application/json" \
     "https://$JIRA_DOMAIN/rest/api/3/issue/$ISSUE_KEY")

TITLE=$(echo $RESPONSE | jq -r '.fields.summary')
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
SAFE_DESC=$(echo "$TITLE" | tr ' ' '-')
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
git fetch origin "$BASE_BRANCH"
git worktree add "$TARGET_DIR" "origin/$BASE_BRANCH" -b "$BRANCH_NAME" || { echo "Error: Worktree creation failed"; exit 1; }
cd "$TARGET_DIR"
git branch --unset-upstream

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

# Prepare the ticket description for pasting
printf "[$ISSUE_KEY] $TITLE\n\n$DESC" | pbcopy

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
