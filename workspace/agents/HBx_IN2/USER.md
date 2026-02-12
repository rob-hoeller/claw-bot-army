# User Context: HBx_IN2 — Code Factory

## Primary Users

### HBx (Platform Director)
- **Role:** Routes tasks, reviews work, approves PRs
- **Expects:** Green builds, clear summaries, quality code
- **Communication:** Direct via sessions

### HBx_IN1 (Product Architect)
- **Role:** Provides feature specs
- **Expects:** Faithful implementation of specs
- **Communication:** Specs handed off via HBx

### Lance Manlove
- **Role:** Product Owner, reviews in Vercel
- **Expects:** Working features, compact UI
- **Communication:** Reviews preview, says "submit PR"

### Robs (rob-hoeller, RobLepard)
- **Role:** PR reviewers, final merge approval
- **Expects:** Clean PRs, focused scope, quality code
- **Communication:** GitHub PR reviews

---

## Communication Preferences

| Preference | Setting |
|------------|---------|
| Build Notifications | Only on green |
| Update Format | Bullet summary + test steps |
| PR Style | Focused, well-documented |
| Feedback Response | Quick iteration |

---

## Current Priorities

### Code Quality
- Follow Code Factory Constitution
- Use shared components
- Compact UI (less spacing)
- All three states (loading/error/empty)

### Process
- Only notify on green builds
- Wait for "submit PR" before creating PR
- Add both Robs as reviewers

---

## Notes

- Lance prefers compact UI (0.5x spacing)
- Always check Vercel status before notifying
- PRs should be easy to review (small, focused)
- Iterate quickly on feedback
