# Contributing to D4Drive

This project is built by multiple agents working concurrently in separate
`git worktree` instances. The protocol below exists so that parallel work merges
cleanly instead of producing conflicts in shared files.

---

## 1. Branch protocol

`main` is clean and always deployable. **Nothing is committed to `main`
directly.** Every change arrives through a branch and a pull request.

| Prefix | Use |
|---|---|
| `feature/` | New capability |
| `fix/` | Bug in shipped behaviour |
| `chore/` | Tooling, dependencies, config |
| `docs/` | Documentation only |
| `refactor/` | Restructuring with no behaviour change |

Branch names are lowercase, hyphenated, and describe the outcome:
`feature/intro-boot-loader`, not `feature/loader-stuff`.

Every issue names its branch in the body. Use that name exactly, so worktree
paths stay predictable across agents.

---

## 2. Worktrees

A worktree gives each concurrent task its own working directory against the same
repository, so two agents never fight over one checkout.

```bash
# From the repository root, once per task
git worktree add ../D4Drive-intro-loader -b feature/intro-boot-loader origin/main

cd ../D4Drive-intro-loader
npm install
```

Each worktree needs its own `node_modules`, and its own `.env` copied from
`.env.example`. `.env` is gitignored and does not travel with the branch.

When the branch is merged:

```bash
git worktree remove ../D4Drive-intro-loader
git branch -d feature/intro-boot-loader
```

`git worktree list` shows what is currently checked out where. Prune stale
entries with `git worktree prune`.

### Avoiding collisions between parallel agents

Issues are grouped into waves in `PROJECT_STATUS.md`. Issues inside a wave touch
disjoint file sets and are safe to run concurrently. Issues in a later wave
depend on an earlier one and must wait.

Three files are edited by nearly every task and are the usual source of merge
conflicts:

- `CHANGELOG.md`
- `PROJECT_STATUS.md`
- `package.json`

**Rule:** add your `CHANGELOG.md` entry as the last commit before opening the PR,
not while you work. Append to the end of the `[Unreleased]` section rather than
inserting in the middle. If two branches both add a dependency, the second to
merge rebases and re-runs `npm install` rather than hand-editing the lockfile.

---

## 3. Commits

Conventional Commits, atomic, present tense.

```
<type>(<scope>): <subject>

<body: why, not what. The diff already says what.>
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`.

Scopes: `intro`, `auth`, `cars`, `booking`, `delivery`, `payment`, `admin`,
`db`, `ui`, `assets`, `ci`.

Good:

```
feat(intro): drive boot loader from real buffered ranges

A timer-based bar reports a number that is not true, and the lie is
visible the moment the network is slow. Binding to the progress event
and reading buffered.end(0) means the bar reflects what has actually
arrived, which is also what lets us pick a sane threshold to reveal
frame one before the full asset lands.
```

Bad:

```
updated stuff
fix
WIP
```

**Subject line is 72 characters or fewer, no trailing period, no em-dash.**

One logical change per commit. If the body needs the word "and" to describe two
unrelated things, it is two commits.

---

## 4. Pull requests

A PR body states:

1. Which issue it closes (`Closes #12`)
2. What changed and why
3. How it was verified
4. Anything deliberately left out

**Before opening a PR, run the pre-merge checklist at the end of `DESIGN.md`.**
A PR that fails a checklist item is not ready, even if the feature works.

```bash
npm run lint
npm run typecheck
npm run lint:copy    # zero em-dashes in user-visible strings
npm run build
```

### Merge strategy

**Squash merge** for feature branches. One issue becomes one commit on `main`,
so history reads as a list of delivered capabilities.

**Rebase, never merge, to update a branch from `main`:**

```bash
git fetch origin
git rebase origin/main
```

Merge commits from `main` into a feature branch produce a tangled graph that is
painful across many parallel worktrees. Keep branch history linear.

Delete the branch after merge.

---

## 5. Review

No branch merges without review. The reviewer checks:

- Does it do what the issue said, and only that?
- Parameterised SQL everywhere, no string-built queries?
- Input validated at the boundary before reaching the service layer?
- Loading, empty, and error states present?
- Every listener, timer, and observer cleaned up?
- Design checklist passed?
- Any secret, credential, or real user data in the diff?

---

## 6. Security reporting

Do not open a public issue for a vulnerability. See `SECURITY.md`.

If a credential is ever committed, rotate it first and clean history second.
History rewriting does not un-leak a secret that has already been pushed.
