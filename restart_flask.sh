#!/bin/bash
while true; do
    if ! pgrep -f "mahjong_flask.py" > /dev/null; then
        echo "$(date): Flask not running, restarting..." >> /tmp/flask_watch.log
        cd /home/tai/mjcal
        nohup python3 mahjong_flask.py > /tmp/flask.log 2>&1 &
    fi
    sleep 30
done
