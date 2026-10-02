# Code quality rules

## Readability

- Code is readable in one pass, without context from other files.
- Names say what a thing is or does. No abbreviations. Booleans read as questions: isDirty, hasComments.
- A function does one thing: max 30 lines, max 4 parameters, max nesting depth 3.
- A file has one responsibility: max 200 lines.
- Prefer early returns. No nested ternaries.
- Rename or extract instead of adding a comment.

## Comments

- Only for why: a hidden constraint, a platform quirk, an invariant. Never for what.
- One or two lines. No history, that goes in the commit message.
- No commented-out code. No TODO in code, tasks live in Todoist.

## Writing style (code, comments, commit messages, docs)

- Plain, specific and neutral. No metaphors, no poetic or marketing words.
- No em dashes. Use a period, comma, colon or parentheses.
- No filler such as "note that", "it is worth noting", "simply", "just". No emoji.
- Error messages say what happened and what the user can do about it.

## Tests

- Tests first for new behaviour: red, green, refactor.
- Arrange, Act, Assert, separated by blank lines. One behaviour per test, named as a sentence.
- Test behaviour, not implementation. Do not mock our own code.
- Never weaken, skip or delete a test to get green.
- Never disable a lint rule. Fix the code, or change the rule in eslint.config.js and say why in the commit.

## Design

- Data first: plain types and functions. Composition over inheritance.
- No abstraction before its second use. No new dependency without a stated reason.
- Handle errors at the boundary. Never swallow them. No any, no non-null assertions.
- Writes to user files are atomic: write a temp file, then rename. Never delete user files automatically.

## Process

- Change only what the task needs. Report unrelated problems instead of fixing them.
- Fix failures at the cause, not at the check.
