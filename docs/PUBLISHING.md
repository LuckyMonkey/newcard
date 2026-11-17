# Publishing this standalone repository

This working tree is a standalone Git repository with its own initial commit. Publish it under a personal or independent organization account, not as a subproject of another platform.

## Quick publish with GitHub CLI

From inside the `NewCard` directory, with `gh` installed and signed in to the desired personal GitHub account:

```bash
gh repo create newcard --public --source . --remote origin --push
```

This creates and pushes `LuckyMonkey/newcard` **only if** you're authenticated as that account. Public visibility is suitable for an open protocol, but review your files before publishing.

## Alternative (browser + Git)

1. Create a blank public repository named `newcard` in your GitHub personal account. **Do not** initialize it with a separate README, license, or `.gitignore` (those are here already).
2. From this project's directory run:

```bash
git remote add origin https://github.com/LuckyMonkey/newcard.git
git push -u origin main
```

Use your existing GitHub credential method when prompted. No existing Fridge repository or remote is involved.
