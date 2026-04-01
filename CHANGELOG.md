# Changelog

## 2026-03-29
- Fixed logout error (React #31) by preventing SyntheticEvent objects from reaching state.
- Added global error handling and removed temporary debug logs after verification.
- Improved UX feedback: debounced search, styled empty states, toast notifications for errors/successes.
- Added system status banner for offline and repeated API failures.
- Added confirmation dialogs for destructive admin actions.
- Added .env.development and .env.production templates.
