# Contributing to Smart Attendance System

Thank you for contributing to the Smart Attendance System. This repository is prepared for enterprise release and follows a professional workflow.

## Contribution Guidelines

### Branching
- Use `main` for production-ready code.
- Use `develop` for integration and pre-release work.
- Create feature branches as `feature/<short-description>`.
- Use `fix/<short-description>` for bug fixes.

### Commit Messages
Use clear, conventional commit messages:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation updates
- `refactor:` code changes with no feature or fix
- `perf:` performance improvement
- `test:` tests added or updated
- `chore:` tooling, build, or dependency changes

### Code Standards
- Follow existing code style patterns.
- Keep imports organized.
- Avoid introducing new dependencies without approval.
- Ensure all changes are covered by tests where applicable.

### Pull Requests
- Target `develop` for new work.
- Include a concise summary of changes.
- Reference related issue IDs if available.
- Use a checklist for testing and documentation updates.

### Testing
- Run unit and integration tests for the affected area.
- Verify backend and frontend builds locally before submitting.
- Confirm Docker Compose services start successfully if infrastructure changes are included.

### Documentation
- Update `README.md`, `CHANGELOG.md`, and `ARCHITECTURE.md` as needed.
- Add or update docs in the `docs/` folder for architecture, API, and deployment changes.

---

## Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env` and update values.
3. Start the application with Docker:
   - `docker compose up -d --build`
4. Confirm services:
   - Frontend: `http://localhost:8080`
   - Backend: `http://localhost:4000`

---

## Reporting Issues
- Create a GitHub issue with a clear title and reproduction steps.
- Label issues appropriately: `bug`, `enhancement`, `documentation`, `security`, `devops`.
- For security issues, do not disclose details publicly. Contact the project owner directly.
