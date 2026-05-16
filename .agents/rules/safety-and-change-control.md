# Safety and Change Control

You must follow these strict safety rules at all times:

- **No Mass Deletion**: Never delete large folders or files without explicit user approval.
- **No Destructive Commands**: Never run destructive shell commands without explicit user approval.
- **Protect Secrets**: Never overwrite `.env`, credentials, secrets, or production configuration files.
- **No Unsolicited Commits**: Never commit code automatically unless explicitly asked by the user.
- **Plan First**: Before making significant edits, always create a plan and request user approval.
- **Summarize Edits**: After making edits, summarize the changed files and the reasoning behind the changes.
- **Reversibility**: Prefer reversible changes and ensure that old states can be recovered if necessary.
