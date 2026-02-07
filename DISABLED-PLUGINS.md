# Disabled Plugins — Re-enable When Fixed

Disabled on 2026-02-06 to unblock `bun install`. These plugins failed to resolve
from the npm registry or workspace. Add them back once the packages are published /
the workspace is wired up correctly.

---

## What was removed

### 1. `@elizaos/plugin-cli` — 404 on npm
- **package.json**: removed `"@elizaos/plugin-cli": "next"`
- **src/eliza.ts**: commented out in `CORE_PLUGINS`
- **src/cli/plugins-cli.ts**: commented out from plugin list
- **Error**: `GET https://registry.npmjs.org/@elizaos%2fplugin-cli - 404` + workspace dep not found

### 2. `@elizaos/plugin-cron` — 404 on npm
- **package.json**: removed `"@elizaos/plugin-cron": "next"`
- **src/eliza.ts**: was already commented out (`// "@elizaos/plugin-cron"`)
- **src/config/plugin-auto-enable.ts**: commented out `cron` entry in `FEATURE_PLUGINS`
- **src/cli/plugins-cli.ts**: commented out from plugin list
- **Error**: `GET https://registry.npmjs.org/@elizaos%2fplugin-cron - 404`

### 3. `@elizaos/plugin-local-embedding` — 404 on npm
- **package.json**: removed `"@elizaos/plugin-local-embedding": "next"`
- **src/eliza.ts**: commented out in `CORE_PLUGINS`
- **Error**: `GET https://registry.npmjs.org/@elizaos%2fplugin-local-embedding - 404`

### 4. `@elizaos/plugin-trust` — tag "next" not found
- **package.json**: removed `"@elizaos/plugin-trust": "next"`
- **src/eliza.ts**: commented out in `CORE_PLUGINS`
- **Error**: `Package "@elizaos/plugin-trust" with tag "next" not found, but package exists`
- **Note**: The package exists on npm, just missing the `next` dist-tag. May only need a re-publish with the tag.

### 5. `@elizaos/plugin-computeruse` — workspace dependency not found
- **package.json**: removed `"@elizaos/plugin-computeruse": "next"`
- **src/eliza.ts**: commented out in `CORE_PLUGINS`
- **Error**: `Workspace dependency "@elizaos/computeruse" not found`
- **Note**: The workspace resolver looked for `@elizaos/computeruse` (without `plugin-` prefix). May need the workspace package added or the dependency switched to a registry version.

---

## How to re-enable

1. Verify the package resolves: `bun info @elizaos/plugin-<name>@next`
2. Add back to `dependencies` in `package.json`
3. Uncomment in `src/eliza.ts` (`CORE_PLUGINS` array)
4. Uncomment in any other files listed above
5. Run `bun install` to confirm clean resolution

---

## Overrides

`@elizaos/plugin-cli` is also a **transitive dependency** of `@elizaos/plugin-browser`
and `@elizaos/plugin-acp` (published to npm with `"@elizaos/plugin-cli": "2.0.0-alpha.3"`).
Since plugin-cli is a 404, we added an override in `package.json`:

```json
"@elizaos/plugin-cli": "npm:@elizaos/core@next"
```

This redirects the unresolvable transitive dep to `@elizaos/core` so the resolver
is satisfied. Remove this override once `@elizaos/plugin-cli` is published to npm.

## plugins.json

The entries in `plugins.json` were **not** touched — they are metadata/registry
entries and don't affect install resolution. No changes needed there.
