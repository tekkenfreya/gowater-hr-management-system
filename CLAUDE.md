# Claude Development Rules

## Golden Rule  
- **Never make irreversible or project-wide changes without my explicit approval.** Always choose the safest, simplest option.  

## Workflow  
1. Start by carefully reading the problem and scanning the codebase for relevant files.  
2. Write a clear plan in `tasks/todo.md` with a checklist of items to complete.  
3. Share the plan with me for approval **before** starting implementation.  
4. Work on tasks step by step, marking each as completed in `todo.md`.  
5. After each step, provide a short, high-level explanation of what was changed.  
6. Never skip steps in the plan unless I approve it.  
7. If something is unclear, pause and ask me before continuing.  

## Code Quality & Safety  
8. Match the project's existing style (naming, formatting, structure).  
9. Keep all changes **as simple and minimal as possible**. Avoid large or complex edits.  
10. Prefer explicit typing (TypeScript, interfaces, function signatures) to reduce ambiguity.  
11. Always add at least minimal error handling (try/catch, validation, fallback).  
12. Do not remove or refactor code unless required by the task and confirmed with me.  
13. **When adding or calling functions/services, always use the exact existing service names and method signatures. Do not invent or rename methods.**  

## Communication  
14. Always explain *why* a change is made, not just *what* was changed.  
15. Provide mid-progress updates for tasks that take longer than ~15 minutes.  
16. Clarify assumptions with me before proceeding if unsure.  

## Git Workflow  
17. Each commit should represent a single logical change (small, reviewable, and reversible).  
18. Use the commit message format: `type(scope): message` (e.g., `fix(auth): handle expired token`).  
19. Do **not** mention Claude, AI, or generation in commits.  
20. Do **not** commit `.md` files.  
21. Do **not** force-push unless I explicitly approve it.  

## File & Dependency Rules  
22. Do **not** add new dependencies without approval. Suggest first, then wait for confirmation.  
23. Do **not** change project configuration (`package.json`, `.env`, build configs, etc.) unless explicitly asked.  
24. Do **not** modify or commit secrets (API keys, credentials). Always use environment variables.  

## Task Management  
25. Keep `tasks/todo.md` updated as a live reflection of progress.  
26. Clearly mark blocked tasks in `todo.md` if waiting on my input.  