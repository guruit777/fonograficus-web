# Record formats

Reference schemas for project memory. Invoked by `AGENTS.md`.

## PROJECT_STATE.md
```md
# Project State
Last verified: <date time TZ from system clock> · Branch: <name> · Commit: <short hash> · Working tree: clean/dirty

## Cold start
≤25 lines, pasteable into any new AI session: purpose · users · stack · repo layout · how to run · current focus · stopping point · next action · constraints · key files.

## Status
What works now, what is partial or broken (with labels). Link to FEATURES.md once it exists.

## Active work
### <T-###> — <title> (owner: <tool/agent or person>, branch: <name>)
- Goal:
- Done:
- Remaining:
- Files touched:
- Last error / blocker:
- Next concrete action:
- Checks to rerun before continuing:

## Blockers and open questions
Each links to its Q-### and names who must answer.

## Assumptions in force
Each labeled ASSUMPTION, with the Q-### it is standing in for when one exists; remove when confirmed or replaced.

## Fragile areas — DO NOT BREAK
What, why, how to verify a change safely.

## Known issues
Symptom · impact · evidence · status.
```

## PROJECT_LOG.md entry
```md
## <YYYY-MM-DD HH:MM TZ> — <tool, and model if known; or person> — <short title>
- Task: <T-### or request>
- Done:
- Files:
- Decisions: D-### / none
- Questions: asked Q-### / answered Q-### / none
- Checks: `<exact command>` — passed | failed (<key output>) | not run — <reason>
- Result: DONE / PARTIAL / BLOCKED
- Next:
```

## docs/DECISIONS.md entry
```md
## D-### — <title> — PROPOSED / ACCEPTED / REJECTED / SUPERSEDED by D-### (<date>)
- Context:
- Decision:
- Alternatives and why not:
- Consequences:
- Revisit if:
- Evidence:
```

## docs/QUESTIONS.md entry
```md
## Q-### — <short question> — OPEN / ANSWERED / OBSOLETE (<date>)
- Asked by → to: <agent or person> → <user / designer / QA / ...>
- Why it matters: <what it blocks, or what changes depending on the answer>
- Answer: <close paraphrase of what was said> — <who answered> — <date>
- Result: D-### / T-### / ASSUMPTION removed / AGENTS.md rule / none
```

## docs/TASKS.md
`| ID | Task | Status | Owner | Branch | Notes |`
Task statuses: TODO · IN PROGRESS · BLOCKED · REVIEW · DONE.

## Labels
Feature status: WORKING · PARTIAL · BROKEN · IN PROGRESS · PLANNED · INTERNAL · DISABLED · DEPRECATED · DEAD / UNREACHABLE.
Confidence: VERIFIED (confirmed by code/test/run) · INFERRED (derived, not observed) · UNKNOWN (no information) · NEEDS VERIFICATION (claimed, not confirmed).
WORKING requires reachable, checked behavior in the stated environment; INTERNAL is not proof of functionality.
