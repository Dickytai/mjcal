#!/bin/bash
# Auto-backup script for Mahjong Calculator
# Monitors files and creates backups when content changes

WATCH_DIR="/home/tai/mjcal"
LOG_FILE="/tmp/auto_backup.log"

# Files to monitor (key = display name)
declare -A MONITOR_FILES=(
    ["mahjong_flask.py"]="mahjong_flask.py"
    ["mj_calc.js"]="mj_calc.js"
    ["templates/index.html"]="templates/index.html"
    ["static/app.css"]="static/app.css"
    ["static/app.js"]="static/app.js"
    ["fan_config.json"]="fan_config.json"
)

# State file for hashes
STATE_FILE="/tmp/mjcal_backup_hashes.state"
# Cooldown in seconds between backups of same file
COOLDOWN=10

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

get_version() {
    local file=$1
    if ls "$file.v"* >/dev/null 2>&1; then
        ls "$file.v"* 2>/dev/null | grep -oE 'v[0-9]+$' | sort -V | tail -1 | tr -d 'v'
    else
        echo "0"
    fi
}

get_file_hash() {
    md5sum "$1" 2>/dev/null | cut -d' ' -f1
}

backup_file() {
    local file=$1
    local current_hash=$(get_file_hash "$file")
    local now=$(date +%s)
    
    if [ -f "$STATE_FILE" ]; then
        last_info=$(grep "^$file:" "$STATE_FILE" 2>/dev/null)
        if [ -n "$last_info" ]; then
            last_hash=$(echo "$last_info" | cut -d: -f2)
            last_time=$(echo "$last_info" | cut -d: -f3)
        else
            last_hash=""
            last_time=0
        fi
    else
        last_hash=""
        last_time=0
    fi
    
    # Backup if hash changed AND cooldown passed
    if [ "$current_hash" != "$last_hash" ] && [ $((now - last_time)) -gt $COOLDOWN ]; then
        current_ver=$(get_version "$file")
        next_ver=$((current_ver + 1))
        
        cp "$file" "$file.v$next_ver"
        log "✅ Auto-backed up: $file → $file.v$next_ver"
        
        # Update hash state
        if [ -f "$STATE_FILE" ]; then
            sed -i "s|^$file:.*||" "$STATE_FILE"
        fi
        echo "$file:$current_hash:$now" >> "$STATE_FILE"
        
        # Restart Flask if mahjong_flask.py changed
        if [[ "$file" == *"mahjong_flask.py" ]]; then
            pkill -9 -f "mahjong_flask.py" 2>/dev/null
            sleep 1
            cd "$WATCH_DIR" && nohup python3 mahjong_flask.py > /tmp/mj.log 2>&1 &
            sleep 2
            log "🔄 Flask restarted"
        fi
        
        return 0
    fi
    return 1
}

# Initial setup
log "🚀 Auto-backup started - watching: ${!MONITOR_FILES[@]}"

# Initialize state file with current hashes
> "$STATE_FILE"
for file in "${!MONITOR_FILES[@]}"; do
    full_path="$WATCH_DIR/$file"
    if [ -f "$full_path" ]; then
        hash=$(get_file_hash "$full_path")
        echo "$file:$hash:0" >> "$STATE_FILE"
    fi
done
log "📊 Initial hashes saved"

# Main loop - check every 3 seconds
while true; do
    for file in "${!MONITOR_FILES[@]}"; do
        full_path="$WATCH_DIR/$file"
        if [ -f "$full_path" ]; then
            backup_file "$full_path"
        fi
    done
    sleep 3
done
