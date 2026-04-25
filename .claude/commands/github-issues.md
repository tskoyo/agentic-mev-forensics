# Fetch GitHub issues

Fetch all open issues from the agentic-mev-forensics repository and display them in a structured way.

## Usage
```
/github-issues [filter]
```

Optional filters: `label:Frontend`, `label:"Agent core"`, `label:Foundation`, `no:assignee`, `#<issue_number>`

## What to do

### Step 1 — check for GitHub CLI
Run:
```bash
gh --version
```

If `gh` is available AND authenticated (`gh auth status`), use it. Otherwise quit the exectuion.

---

### Step 2 — GitHub CLI

Fetch all open issues with full detail:
```bash
gh issue list \
  --state open \
  --limit 100 \
  --json number,title,labels,assignees,createdAt,body \
  | jq '.'
```

If a filter was provided, add it:
```bash
# Filter by label
gh issue list --repo tskoyo/agentic-mev-forensics --state open --label "Frontend" --limit 100 --json number,title,labels,body | jq '.'

# Fetch a specific issue
gh issue view <number> --repo tskoyo/agentic-mev-forensics --json number,title,labels,body,comments
```

---

### Step 3 — Display results

Group issues by label and display clearly.

Example:
```
FOUNDATION (#1–#6)
  #1  feat(shared): core TypeScript types
  #2  feat(rpc): viem wrapper
  ...

AGENT CORE (#7–#10)
  #7  feat(claude): generic tool-use loop
  ...

FRONTEND (#25–#36)
  #25  feat(web): clickable citation chips
  ...

UNASSIGNED / OTHER
  ...
```

If a specific issue number was requested, display the full body and any comments.

---

### Step 3 — Map to execution plan

After listing issues, cross-reference with the 12-day plan from CLAUDE.md and note:
- Which issues are on the critical path for today's day number
- Which Foundation issues must be completed before Agent Core work begins
- Which Frontend issues must NOT be started before Day 6
