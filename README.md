# Claude Token Dashboard

Visualize your Claude Code token usage by project and date.

![Dashboard Screenshot](screenshot.png)

## What it shows
- Token usage per project (output / input / cache read / cache create)
- Daily usage chart  
- Cache read ratio

## Why I built this
I had no idea how many tokens I was burning per project in Claude Code.
Turns out all the data is sitting in ~/.claude/projects/ as JSONL files.
