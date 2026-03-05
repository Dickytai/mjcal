#!/usr/bin/env python3
"""
Sheauhaw Wrapper - Python wrapper for Sheauhaw algorithm
Calls the Node.js adapter via subprocess
"""

import json
import subprocess
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def calculate_shanten(tiles, tile_count, wildcards=None):
    """
    Calculate shanten using Sheauhaw algorithm
    
    Args:
        tiles: dict like {"1m": 3, "2m": 2, ...}
        tile_count: int (14, 16, etc.)
        wildcards: dict like {"1j": 2, "2j": 1, ...}
    
    Returns:
        int: -1 (win), 0 (ready), positive (distance)
    """
    if wildcards is None:
        wildcards = {}
    
    cmd = [
        'node',
        os.path.join(SCRIPT_DIR, 'sheauhaw_adapter.js'),
        'step',
        json.dumps(tiles),
        str(tile_count),
        json.dumps(wildcards)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
    
    if result.returncode != 0:
        raise Exception(f"Node error: {result.stderr}")
    
    return int(result.stdout.strip())

def calculate_waiting(tiles, tile_count, wildcards=None):
    """
    Calculate waiting tiles using Sheauhaw algorithm
    
    Args:
        tiles: dict like {"1m": 3, "2m": 2, ...}
        tile_count: int (14, 16, etc.)
        wildcards: dict like {"1j": 2, "2j": 1, ...}
    
    Returns:
        list: waiting tiles like ["2m", "3m", ...]
    """
    if wildcards is None:
        wildcards = {}
    
    cmd = [
        'node',
        os.path.join(SCRIPT_DIR, 'sheauhaw_adapter.js'),
        'waiting',
        json.dumps(tiles),
        str(tile_count),
        json.dumps(wildcards)
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    
    if result.returncode != 0:
        raise Exception(f"Node error: {result.stderr}")
    
    return json.loads(result.stdout.strip())


if __name__ == '__main__':
    import sys
    from collections import Counter
    
    if len(sys.argv) < 3:
        print("Usage: python sheauhaw_wrapper.py <command> <tiles_json> <count> [wildcards_json]")
        sys.exit(1)
    
    command = sys.argv[1]
    tiles = json.loads(sys.argv[2])
    count = int(sys.argv[3])
    wildcards = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    
    if command == 'step':
        result = calculate_shanten(tiles, count, wildcards)
        print(result)
    elif command == 'waiting':
        result = calculate_waiting(tiles, count, wildcards)
        print(json.dumps(result))
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
