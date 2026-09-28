---
version: alpha
name: explicit-least-privilege-gating
description: Sets up interactive verification barriers and restricts shell access limits.
---

# Least Privilege & Gating Operations

## 1. Tool Call Verification Gates [gate-verify]
- **Destructive Action Barriers:** If Jarvis generates a tool command attempting a write, update, delete, or system execution block, pause the execution thread instantly.
- **Human Approval Hooks:** Output a clear structural log detailing the target payload changes, and block further automation until a manual `Y/N` verification string is submitted.
- **Directory Restrictions:** Clamp shell tools to isolated project directories; block access to master configuration directories (`~/.bashrc`, `/etc/`).
