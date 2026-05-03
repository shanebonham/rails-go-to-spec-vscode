# Rails Go to Spec (personal fork)

Jump between code and spec in Rails projects.

This is a personal fork of [sporto/rails-go-to-spec-vscode](https://github.com/sporto/rails-go-to-spec-vscode) with one addition: user-configurable custom file mappings (see below).

## Installing from this fork

The marketplace version does not include the custom mappings feature. To install this fork, build a `.vsix` and install it locally.

```bash
git clone git@github.com:shanebonham/rails-go-to-spec-vscode.git
cd rails-go-to-spec-vscode
npm install
npm install -g @vscode/vsce   # one-time
vsce package                  # produces rails-go-to-spec-X.Y.Z.vsix
```

Then in VS Code / Cursor:

1. Uninstall any existing `sporto2.rails-go-to-spec-2` extension (the marketplace version uses the same identifier, so it will conflict).
2. Extensions panel → `…` menu → **Install from VSIX…** → pick the generated file.

Or from the CLI:

```bash
code --install-extension rails-go-to-spec-*.vsix
```

Note: because the identifier matches the marketplace listing, VS Code may offer to "update" back to the published version. If that becomes annoying, change `name` and `publisher` in `package.json` before packaging.

## Keybinding

Default:

- `Ctrl + Shift + Y`
- `Cmd + Shift + Y` (Mac)

To rebind, in `keybindings.json`:

```json
{
  "key": "shift-cmd-y",
  "command": "rails-go-to-spec-2.railsGoToSpec",
  "when": "editorFocus"
}
```

## Custom mappings

The default resolver handles standard Rails layouts (`app/**/foo.rb` ↔ `spec/**/foo_spec.rb`, views, Docker, etc.). For anything outside that — Rake tasks, custom directory structures, non-standard naming — define your own mappings in VS Code settings under `railsGoToSpec.customMappings`.

Each entry is a `{ pattern, target }` pair:

- **`pattern`** — a regex (as a string) matched against the absolute file path. Use capture groups to extract the parts you want to reuse.
- **`target`** — the path of the related file, relative to the workspace root. Use `$1`, `$2`, … to substitute the captures from `pattern`.

Mappings are bidirectional: the extension also derives the reverse direction automatically, so you only need to define one direction. Custom mappings are tried first; if none match, the default resolver runs.

### Example: Rake tasks

```json
"railsGoToSpec.customMappings": [
  {
    "pattern": ".*/lib/tasks/(.+)\\.rake$",
    "target": "spec/lib/tasks/$1_rake_spec.rb"
  }
]
```

With this setting, jumping from `lib/tasks/cleanup.rake` opens `spec/lib/tasks/cleanup_rake_spec.rb`, and vice versa.

### Notes

- Backslashes in the regex must be escaped for JSON (e.g. `\\.` for a literal dot).
- The pattern matches against the full absolute path, so prefix with `.*/` to anchor at any depth.
- The workspace root is inferred from the first `/app/`, `/spec/`, or `/lib/` segment in the current file's path.
