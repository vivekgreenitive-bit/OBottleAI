# Graphify Knowledge Graph — Automated Setup

> **For**: AI coding assistants (Antigravity, Claude Code, etc.)
> **Source**: https://github.com/safishamsi/graphify · PyPI: `graphifyy` (double-y) · CLI: `graphify` (single-y)
>
> **How to use**: Place this file in any project root. Tell your AI assistant:
> "Read GRAPHIFY_SETUP.md and execute it" or simply "integrate Graphify"
>
> **Agent**: Execute ALL phases below sequentially. Do NOT ask the user for confirmation
> between steps. Do NOT skip steps. If a step fails, try the fallback before stopping.
> After setup, you MUST use the graph automatically in every conversation — the user
> should NEVER have to tell you to use graphify.

---

## Phase 1: Detect Operating System

Run this first to determine the OS. All subsequent commands depend on this.

```bash
uname -s 2>/dev/null || echo "WINDOWS"
```

Map the output:
- `Darwin` → **macOS** — use Homebrew paths, pipx/uv preferred, `~/Library/Python/3.x/bin` for pip
- `Linux` → **Linux** — use apt/system paths, pipx/uv preferred, `~/.local/bin` for pip
- `WINDOWS` or `MINGW*` or `MSYS*` → **Windows** — use `winget`/`pip`, PowerShell paths

Also detect the architecture (for Apple Silicon vs Intel):
```bash
uname -m 2>/dev/null
```
- `arm64` → Apple Silicon Mac
- `x86_64` → Intel Mac or Linux x86

Store the OS result mentally. Use it for all installation decisions below.

---

## Phase 2: Check Python Version

```bash
python3 --version 2>/dev/null || python --version 2>/dev/null
```

**Requirement**: Python 3.10 or higher.

If Python is not found or below 3.10:
- **macOS**: `brew install python@3.12`
- **Linux (Ubuntu/Debian)**: `sudo apt install python3.12 python3-pip`
- **Windows**: `winget install Python.Python.3.12`

If Python cannot be installed automatically, STOP and tell the user:
> "Python 3.10+ is required. Please install Python from https://www.python.org/downloads/ and try again."

---

## Phase 3: Check if Graphify is Already Installed

```bash
graphify --version 2>/dev/null
```

If graphify is already installed and working, skip to **Phase 5** (build the graph).

If `graphify: command not found`, continue to **Phase 4**.

---

## Phase 4: Install Graphify

> **IMPORTANT**: The PyPI package is `graphifyy` (double-y). Other `graphify*` packages on PyPI
> are NOT affiliated. The CLI command after install is `graphify` (single-y).
>
> **IMPORTANT**: Avoid `pip install` on macOS/Windows if possible. The skill resolves Python at
> runtime from `graphify-out/.graphify_python`; if that points to a different environment than
> where pip installed the package, you'll get `ModuleNotFoundError: No module named 'graphify'`.
> `uv tool install` and `pipx install` isolate the package in their own env and avoid this entirely.

### Step 4a: Try `uv` first (recommended — fastest, cleanest PATH handling)

```bash
command -v uv >/dev/null 2>&1
```

If `uv` is available:
```bash
uv tool install graphifyy
```

If `uv` is NOT available, try to install it:

- **macOS**:
  ```bash
  brew install uv 2>/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Linux**:
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Windows**:
  ```bash
  winget install astral-sh.uv
  ```

Then retry:
```bash
uv tool install graphifyy
```

### Step 4b: Fallback to `pipx` (if uv fails or isn't available)

```bash
command -v pipx >/dev/null 2>&1
```

If `pipx` is available:
```bash
pipx install graphifyy
```

If `pipx` is NOT available:
- **macOS**: `brew install pipx && pipx ensurepath`
- **Linux**: `sudo apt install pipx 2>/dev/null || pip install pipx`
- **Windows**: `pip install pipx`

Then retry:
```bash
pipx install graphifyy
```

### Step 4c: Last resort — pip (only if both uv and pipx fail)

> **WARNING**: This may cause PATH issues on macOS. Only use as last resort.

- **macOS**:
  ```bash
  python3 -m pip install graphifyy --break-system-packages 2>/dev/null || python3 -m pip install --user graphifyy
  ```
  Then ensure PATH includes: `~/Library/Python/3.x/bin`

- **Linux**:
  ```bash
  python3 -m pip install --user graphifyy
  ```
  Then ensure PATH includes: `~/.local/bin`

- **Windows**:
  ```bash
  pip install graphifyy
  ```

### Step 4d: Verify installation

```bash
graphify --help
```

If this still fails, try running directly:
```bash
python3 -m graphify --help
```

### Step 4e: GitHub Fallback (if ALL above steps fail)

If NONE of the installation methods worked, **do NOT give up**. Fetch the latest installation
instructions directly from the official GitHub repository and follow them:

1. **Read the official README** by fetching:
   `https://github.com/safishamsi/graphify`

   Look specifically for the **Install** and **Prerequisites** sections.
   The README has the most up-to-date commands for every OS.

2. **Check for known issues** by fetching:
   `https://github.com/safishamsi/graphify/issues`

   Search for error messages from the failed installation. Common issues:
   - `ModuleNotFoundError: No module named 'graphify'` → Python environment mismatch, use `uv tool install` or `pipx install` instead of `pip`
   - `externally-managed-environment` → macOS Homebrew Python blocks pip. Use `pipx` or `uv`
   - `graphify: command not found` after pip install → PATH missing. Add `~/.local/bin` (Linux) or `~/Library/Python/3.x/bin` (Mac) to PATH
   - Permission errors → Try with `--user` flag or use `pipx`/`uv` which don't need sudo

3. **Try the Python interpreter detection from the Graphify skill** as a last resort:
   ```bash
   PYTHON=""
   GRAPHIFY_BIN=$(which graphify 2>/dev/null)
   # 1. uv tool installs
   if [ -z "$PYTHON" ] && command -v uv >/dev/null 2>&1; then
       _UV_PY=$(uv tool run graphifyy python -c "import sys; print(sys.executable)" 2>/dev/null)
       if [ -n "$_UV_PY" ]; then PYTHON="$_UV_PY"; fi
   fi
   # 2. Read shebang from graphify binary (pipx and direct pip installs)
   if [ -z "$PYTHON" ] && [ -n "$GRAPHIFY_BIN" ]; then
       _SHEBANG=$(head -1 "$GRAPHIFY_BIN" | tr -d '#!')
       case "$_SHEBANG" in
           *[!a-zA-Z0-9/_.-]*) ;;
           *) "$_SHEBANG" -c "import graphify" 2>/dev/null && PYTHON="$_SHEBANG" ;;
       esac
   fi
   # 3. Fall back to python3
   if [ -z "$PYTHON" ]; then PYTHON="python3"; fi
   # 4. Auto-install if import fails
   if ! "$PYTHON" -c "import graphify" 2>/dev/null; then
       if command -v uv >/dev/null 2>&1; then
           uv tool install --upgrade graphifyy -q 2>&1 | tail -3
       else
           "$PYTHON" -m pip install graphifyy -q 2>/dev/null \
             || "$PYTHON" -m pip install graphifyy -q --break-system-packages 2>&1 | tail -3
       fi
   fi
   ```

4. If EVERYTHING still fails, tell the user:
   > "Installation failed after trying uv, pipx, pip, and the Graphify interpreter detection.
   > Please visit https://github.com/safishamsi/graphify#install for the latest instructions
   > for your OS. Common fix: `brew install uv && uv tool install graphifyy`
   > Once installed, tell me to continue the Graphify setup."

   Then STOP and wait for the user to install manually. Once they confirm, resume from **Phase 5**.

---

## Phase 5: Register the Skill with Antigravity

This writes config files that make Antigravity consult the knowledge graph automatically.

```bash
graphify install
```

Then specifically for Antigravity:
```bash
graphify antigravity install
```

This creates:
- Skill file at `~/.gemini/config/skills/graphify/SKILL.md`
- Always-on rule at `.agents/rules/graphify.md` — tells the agent to query the graph before reading files
- Workflow trigger at `.agents/workflows/graphify.md` — enables the `/graphify` command

### Verify the files were created:
```bash
ls -la .agents/rules/graphify.md .agents/workflows/graphify.md 2>/dev/null
ls -la ~/.gemini/config/skills/graphify/SKILL.md 2>/dev/null
```

If `graphify antigravity install` failed or the files don't exist, create them manually — see **Appendix A** below.

---

## Phase 6: Build the Knowledge Graph

Run from the project root (the directory this file is in, or where the user's code lives):

```bash
graphify .
```

This takes 1–5 minutes depending on project size. It:
1. Parses all source files with Tree-sitter ASTs (deterministic, zero API cost)
2. Extracts functions, classes, imports, and call relationships
3. Runs Leiden community detection to group related code into communities
4. Writes outputs to `graphify-out/`

### Verify the build:

```bash
ls -la graphify-out/graph.json graphify-out/GRAPH_REPORT.md graphify-out/graph.html 2>/dev/null
```

All three files MUST exist. If any are missing, the build failed — check the terminal output for errors and retry.

### Print graph summary:
```bash
graphify query "what are the core modules and how do they connect?"
```

Show this output to the user so they can see the graph working.

---

## Phase 7: Add graphify-out/ to .gitignore

The graph is a local development tool — each developer builds their own. Don't commit it.

```bash
if [ -f .gitignore ]; then
    grep -q "graphify-out/" .gitignore 2>/dev/null || echo "graphify-out/" >> .gitignore
else
    echo "graphify-out/" > .gitignore
fi
```

---

## Phase 8: Create Safe Editing Rules

Create `.agents/rules/safe-editing.md` to prevent cascading bugs:

```bash
mkdir -p .agents/rules
```

Write this file at `.agents/rules/safe-editing.md`:

```markdown
---
trigger: always_on
description: Prevent AI from introducing cascading bugs by enforcing scoped, minimal edits.
---

## Safe Editing Rules

BEFORE making any code change, you MUST:

1. **Run `graphify explain "<symbol>"` first** — understand what connects to it
2. **State the file(s) you will modify** — list them explicitly
3. **State what you will NOT modify** — list files you considered but won't touch
4. **Explain why each edit is necessary** — no "while we're here" cleanup
5. **Make the minimal change** — fix the bug, nothing more

NEVER do these without explicit user approval:
- Refactor code that isn't broken
- "Improve" error handling in unrelated files
- Update imports or type hints in files you weren't asked to change
- Add logging, comments, or formatting changes to untouched files
- Change function signatures that other files depend on

If a fix requires changing multiple files, list ALL affected files and get approval BEFORE editing.

After every edit, run: `graphify update .`
```

---

## Phase 9: Run Verification Queries

Test all three query modes to confirm the graph is fully functional:

```bash
# 1. Broad architecture question
graphify query "what are the main components and how do they interact?"
```

```bash
# 2. Explain the most connected symbol (pick from the query output above)
graphify explain "<pick_main_symbol_from_output>"
```

```bash
# 3. Trace a path between two related symbols
graphify path "<symbol_A>" "<symbol_B>"
```

```bash
# 4. Verify incremental update works
graphify update .
```

---

## Phase 10: Save as Knowledge Item for Cross-Conversation Persistence

> **This is critical.** Without this step, the agent forgets about graphify in new conversations.

Save a Knowledge Item so that this agent remembers to use graphify in EVERY future conversation
about this project. The knowledge item should contain:

**Title**: `Graphify Knowledge Graph — Always Use Graph Before Editing`

**Summary**: When debugging or fixing bugs in this project, ALWAYS run graphify commands
(explain, path, query) BEFORE making any code changes. This prevents hallucination and
the "fix one bug, create three bugs" problem. After editing, run `graphify update .` to
keep the graph fresh. Never scan random files — the graph has the map.

**Details to remember**:
- This project has a graphify knowledge graph at `graphify-out/graph.json`
- ALWAYS run `graphify query`, `graphify explain`, or `graphify path` BEFORE reading raw source files
- ALWAYS run `graphify update .` AFTER making any code changes (takes <2 seconds, free)
- `graphify query "<question>"` returns a scoped subgraph (~2K tokens vs ~27K for reading raw files = 12x savings)
- `graphify explain "<symbol>"` shows all connections for a function/class
- `graphify path "<A>" "<B>"` traces how two symbols connect
- NEVER scan 10+ files "for context" — query the graph instead
- NEVER edit files the user didn't mention — unless graphify proves they're the actual cause
- One bug = one fix — don't "improve" adjacent code
- After ~20 tool calls in a debugging chain, suggest starting a fresh conversation

If the agent platform supports creating Knowledge Items programmatically, do so now.
If not, remind the user: "Please ask me to save this as a knowledge item so I remember
to use graphify in every conversation."

---

## Phase 11: Report to User

After all phases complete, print this summary:

```
✅ Graphify integration complete!

OS detected: [macOS/Linux/Windows]
Python: [version]
Graphify installed via: [uv/pipx/pip]

Graph built:
  📊 graphify-out/graph.json       → queryable knowledge graph
  📋 graphify-out/GRAPH_REPORT.md  → architecture highlights, god nodes, communities
  🌐 graphify-out/graph.html       → interactive visualization (open in browser)

Agent rules installed:
  🔧 .agents/rules/graphify.md      → I now query the graph before reading files
  🛡️ .agents/rules/safe-editing.md  → I declare edit scope before making changes
  ⚡ .agents/workflows/graphify.md  → /graphify command available

What changes from now on:
  • I query the graph AUTOMATICALLY — you never need to ask me to use graphify
  • I declare which files I'm editing BEFORE making changes
  • I run `graphify update .` after every edit to keep the graph fresh
  • Architecture questions get answered from the graph, not by reading raw files
  • Estimated 12x fewer tokens per question = faster + cheaper responses

To see your codebase visualization:
  open graphify-out/graph.html

To keep the graph fresh after code changes:
  graphify update .     (AST-only, <2 seconds, zero API cost)

Optional — auto-rebuild on every git commit:
  graphify hook install
```

---

## POST-SETUP: Agent Behavior Rules (Permanent)

> **Agent**: Once this setup is complete, the rules below govern your behavior PERMANENTLY
> for this project. You do NOT wait for the user to mention graphify. You use it automatically.

### Rule 1: Graph-First for All Codebase Questions

When the user asks ANY question about the codebase (architecture, how something works,
what calls what, etc.), you MUST:

1. Run `graphify query "<question>"` or `graphify explain "<symbol>"` FIRST
2. Use the graph output to formulate your answer
3. ONLY read raw source files if the graph doesn't cover what's needed
4. NEVER scan 10+ files "for context" — the graph is 12x cheaper

### Rule 2: Blast Radius Check Before Every Edit

Before modifying ANY code, you MUST:

1. Run `graphify explain "<symbol_being_changed>"` to see what depends on it
2. State which files you WILL modify and which you WILL NOT modify
3. Explain why each edit is necessary
4. If changing a function signature, check all callers via `graphify explain`

### Rule 3: Refresh After Every Edit

After making code changes:
```bash
graphify update .
```
This takes <2 seconds and costs nothing. Always run it.

### Rule 4: Check if Graph Exists at Conversation Start

At the START of every new conversation about this project, silently check:
```bash
ls graphify-out/graph.json 2>/dev/null
```

- If `graph.json` exists → use the graph for all queries
- If `graph.json` is missing → run `graphify .` to rebuild it before doing anything else
- If `graphify` command is not found → follow Phase 4 above to install it

### Rule 5: Anti-Patterns (NEVER do these)

- ❌ Scanning 10+ files "for context" → use `graphify query` (12x fewer tokens)
- ❌ Editing files the user didn't mention → unless graphify proves they're the cause
- ❌ "Fixing" multiple unrelated things in one edit → one bug = one fix
- ❌ Guessing about file relationships → the graph has the map
- ❌ Continuing long debugging chains → suggest fresh conversation after ~20 tool calls
- ❌ Re-reading raw source for architecture questions → the graph already knows

---

## Appendix A: Manual Rule Files (if `graphify antigravity install` fails)

### `.agents/rules/graphify.md`

```markdown
---
trigger: always_on
description: Use graphify knowledge graph for ALL debugging, bug fixing, and code changes. Prevents hallucination and reduces token cost by 12x.
---

## Graphify-First Workflow

This project has a knowledge graph at `graphify-out/`.
**You MUST use it before and after every code change.** Do NOT skip these steps.

### BEFORE any code change — UNDERSTAND first

1. Identify the symbol/function/class involved in the bug or task
2. Run `graphify explain "<symbol>"` — see all connections, callers, dependencies
3. Run `graphify path "<A>" "<B>"` — trace how two things connect
4. Run `graphify query "<question>"` — get a scoped subgraph (~2K tokens instead of ~27K for raw files)

**CRITICAL**: Do NOT scan random source files for context. The graph has the map.

### BEFORE editing — SCOPE your changes

State explicitly:
- **Files I WILL modify**: list them
- **Files I will NOT modify**: list connected files that don't need changes
- **Blast radius**: what could break (from graphify explain output)

Rules:
- NEVER edit files you weren't asked to change unless graphify proves they're the cause
- NEVER refactor or "improve" adjacent code
- If function signatures change, check all callers first
- If 3+ files need changes, ASK the user for approval

### AFTER every edit — VERIFY

```bash
graphify update .
```
(<2 seconds, zero cost)

### For architecture questions

- `graphify query "<question>"` — always first choice
- `graphify path "<A>" "<B>"` — for tracing relationships
- `graphify explain "<concept>"` — for focused deep dives
- NEVER read raw source files when the graph can answer

### Quick Reference

| Situation | Command |
|-----------|---------|
| Bug in a function | `graphify explain "<function>"` |
| How A connects to B | `graphify path "<A>" "<B>"` |
| General question | `graphify query "<question>"` |
| After editing code | `graphify update .` |
| Budget-capped query | `graphify query "<q>" --budget 1500` |
```

### `.agents/workflows/graphify.md`

```markdown
---
name: graphify
description: Turn any folder of files into a navigable knowledge graph
---

# Workflow: graphify

Follow the graphify skill installed at ~/.gemini/config/skills/graphify/SKILL.md to run the full pipeline.

If no path argument is given, use `.` (current directory).
```

---

## Appendix B: GitHub Fallback — Troubleshooting Reference

> **Agent**: If ANY phase fails during setup, use this appendix to self-diagnose.
> Read the official repo directly — do NOT guess at solutions.

### Official Resources

| Resource | URL | When to Use |
|----------|-----|-------------|
| **GitHub Repo** | https://github.com/safishamsi/graphify | Latest install instructions, README, prerequisites |
| **PyPI Package** | https://pypi.org/project/graphifyy/ | Check latest version, verify package name |
| **GitHub Issues** | https://github.com/safishamsi/graphify/issues | Search for error messages, known bugs |
| **Changelog** | https://github.com/safishamsi/graphify/blob/v8/CHANGELOG.md | Check for breaking changes in new versions |

### Auto-Diagnosis Flow

When an error occurs, follow this decision tree:

```
Error occurred
    │
    ├─ Installation error?
    │   ├─ "externally-managed-environment" → Use pipx or uv, not pip
    │   ├─ "command not found" after install → PATH issue, check ~/.local/bin or ~/Library/Python/3.x/bin
    │   ├─ "ModuleNotFoundError" → Python env mismatch, reinstall with uv tool install
    │   ├─ Permission denied → Try --user flag or use pipx/uv
    │   └─ Other → Fetch https://github.com/safishamsi/graphify#install for latest steps
    │
    ├─ Build error (graphify . fails)?
    │   ├─ "No supported files found" → Wrong directory, cd to project root
    │   ├─ "Graph is empty" → All files were skipped or binary-only corpus
    │   ├─ Timeout / hang → Large corpus, try graphify . --no-viz first
    │   └─ Other → Fetch https://github.com/safishamsi/graphify/issues and search for error
    │
    ├─ Query error (graphify query fails)?
    │   ├─ "graph.json not found" → Run graphify . first to build the graph
    │   ├─ "No matching nodes" → Try broader query or check graphify-out/GRAPH_REPORT.md for node names
    │   └─ Other → Run graphify update . to refresh, then retry
    │
    └─ antigravity install error?
        ├─ Files not created → Create manually from Appendix A
        ├─ Skill not loaded → Restart conversation so agent picks up new rules
        └─ Other → Fetch https://github.com/safishamsi/graphify and search for "antigravity"
```

### Reading the GitHub Repo at Runtime

If you (the agent) need to troubleshoot and the above table doesn't cover the error,
**read the GitHub repo directly**:

1. Fetch `https://github.com/safishamsi/graphify` — the README has the most current install/usage docs
2. Fetch `https://pypi.org/project/graphifyy/` — check the latest published version
3. Search GitHub Issues: `https://github.com/safishamsi/graphify/issues?q=<error_message>`

Use the information from the repo to resolve the issue. Do NOT make up solutions —
if the repo says something different from this file, **the repo is correct** (it's more recent).

### Version Compatibility Notes

- Graphify requires **Python 3.10+**
- The `uv` tool is the officially recommended installer (as of 2026)
- The PyPI package is **`graphifyy`** (double-y) — this is confirmed and will not change
- The CLI command is **`graphify`** (single-y)
- `graphify install` auto-detects the AI platform; `graphify antigravity install` is the explicit Antigravity path
- On macOS with Homebrew Python, `pip install` will fail with `externally-managed-environment` — always use `pipx` or `uv`
