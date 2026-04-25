# Fetch pull request info

Fetch and display the details of a pull request from the agentic-mev-forensics repository.

## Usage
```
/pr-info <pr_number>
```

## What to do

### Step 1 — verify gh is authenticated

```bash
gh auth status
```

If not authenticated, stop and tell the user:
```
GitHub CLI is not authenticated. Run:
  gh auth login
```

---

### Step 2 — fetch PR details

```bash
gh pr view <pr_number> \
  --repo tskoyo/agentic-mev-forensics \
  --json number,title,body,state,baseRefName,headRefName,author,labels,assignees,createdAt,additions,deletions,files,reviews,comments
```

---

### Step 3 — display the results

Present the information clearly:

```
PR #<number> — <title>

State:    <state>
Author:   <author>
Branch:   <head> → <base>
Labels:   <labels>
Created:  <date>
Changes:  +<additions> -<deletions> across <n> files

Description:
<body>

Files changed:
<list of files>

Reviews:
<list of reviews with author and status>

Comments:
<list of comments with author>
```

If there are no reviews or comments, say so explicitly rather than leaving the section blank.