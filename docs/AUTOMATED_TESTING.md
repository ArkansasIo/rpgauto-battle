# Automated RPG System Tests

The repository uses Node.js's built-in test runner so domain-system tests do not need a separate test framework.

## Run the tests

Install project dependencies, then run:

```bash
npm install
npm test
```

The test command is `node --test tests/*.test.mjs`. Tests are deterministic where possible; loot checks use fixed seeds rather than relying on random sampling.

## Coverage

- **Character progression:** XP thresholds, level resolution, the level cap, progression brackets and invalid level input.
- **Character data:** class lookup and default core attributes.
- **Combat math:** derived-stat scaling and damage minimum/critical multipliers.
- **Inventory:** item validation, stack limits, item removal and missing IDs.
- **Equipment:** invalid slots, level requirements, class restrictions and complete empty equipment layout.
- **Loot:** fixed-seed rarity outcomes, bounded affix counts and generated item power.
- **World content:** biome/zone/dungeon/raid catalogs and the 100-floor tower's elite/boss cadence.
- **Talents:** rank incrementing and rejection of invalid or capped talents.

## Continuous integration

The `.github/workflows/ci.yml` workflow runs `npm test` alongside source syntax checks and RPG source validation on pushes and pull requests targeting `main`. A failing test fails the validation job.

These tests guard existing data/system behavior. They do not replace integration testing in Electron, Android device testing, or authoritative server-side validation for a future multiplayer deployment.
