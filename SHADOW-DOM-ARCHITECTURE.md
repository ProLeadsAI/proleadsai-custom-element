# Shadow DOM Architecture

This document describes how the `<roof-estimator>` custom element uses **Shadow DOM** for full CSS isolation from WordPress themes.

---

## Why Shadow DOM?

WordPress themes ship aggressive `reset.css` files that override button styles (borders, colors, backgrounds) on all `<button>` elements. Since Tailwind v4 emits utilities inside `@layer`, unlayered theme CSS **always wins** per CSS spec. Shadow DOM creates a hard CSS boundary that prevents any theme styles from leaking in.

---

## How It Works

### 1. Shadow Root Creation (`src/custom-element.ts`)

When `<roof-estimator>` connects to the DOM:

1. **Creates a Shadow DOM** via `this.attachShadow({ mode: 'open' })`
2. **Loads the widget CSS** into the shadow root via a `<link>` tag (auto-detected from the script's URL)
3. **Creates a teleport target** (`#proleadsai-teleport`) inside the shadow root for modals/overlays
4. **Mounts the Vue app** inside the shadow root

```
<roof-estimator>
  #shadow-root (open)
    <link rel="stylesheet" href=".../proleadsai-widget.css">
    <div id="proleadsai-teleport">
      <!-- Teleported content: overlays, panels, modals -->
    </div>
    <div>
      <!-- Vue app mounts here -->
    </div>
</roof-estimator>
```

### 2. CSS Loading

The widget CSS URL is resolved automatically by:
1. Finding the `<script>` tag with `proleadsai-widget` in its `src`
2. Deriving the CSS path from the script path (`/js/` → `/css/`)
3. Falling back to any existing `<link>` tag with `proleadsai-widget` in its `href`

### 3. Teleport Targets

Vue's `<Teleport>` normally targets `document.body`, but content teleported to `<body>` escapes the Shadow DOM and loses all Tailwind styles.

**Solution**: All `<Teleport>` components target `window.__PROLEADSAI_TELEPORT__` — a `<div>` inside the shadow root.

Affected components:
- `src/components/FloatingLauncher.vue` — overlay + slide-out panel
- `src/components/RoofResultModal.vue` — results modal

Pattern used:
```vue
<Teleport :to="teleportTarget" :disabled="!teleportTarget">

// In <script setup>
const teleportTarget = computed(() => window.__PROLEADSAI_TELEPORT__ || null)
```

### 4. Google Places Autocomplete (`.pac-container`)

Google Maps appends `.pac-container` to `<body>`, outside the Shadow DOM. These styles are injected into `document.head` via JavaScript in `custom-element.ts` (not in `style.css`).

### 5. Google Fonts

Google Fonts are loaded into `document.head` (not the shadow root). Fonts declared in the main document are inherited by Shadow DOM content.

### 6. `:host` Reset (`src/style.css`)

```css
:host {
  all: initial;
  display: block;
  font-family: ui-sans-serif, system-ui, sans-serif, ...;
}
```

- `all: initial` resets all inherited properties from the parent page
- `display: block` ensures the element is visible
- `font-family` sets the default font stack

**Do NOT add `contain: content`** — it breaks `position: fixed` inside the shadow root (modals, overlays, floating button would be positioned relative to the host element instead of the viewport).

---

## Global Window Properties

Set by `custom-element.ts`, used by Vue components:

| Property | Type | Description |
|---|---|---|
| `window.__PROLEADSAI_CONFIG__` | `object` | Widget configuration from attributes |
| `window.__PROLEADSAI_SHADOW_ROOT__` | `ShadowRoot` | Reference to the shadow root |
| `window.__PROLEADSAI_TELEPORT__` | `HTMLElement` | Teleport target div inside shadow root |

TypeScript declarations are in `src/types/google-maps.d.ts`.

---

## Files Involved

| File | Role |
|---|---|
| `src/custom-element.ts` | Creates shadow root, loads CSS, sets up teleport target |
| `src/style.css` | `:host` reset + Tailwind import (loaded into shadow root) |
| `src/types/google-maps.d.ts` | TypeScript declarations for window globals |
| `src/components/FloatingLauncher.vue` | Uses `teleportTarget` for overlay + panel |
| `src/components/RoofResultModal.vue` | Uses `teleportTarget` for modal |
| `vite.config.ts` | `cssCodeSplit: false` to keep CSS in one file |

---

## Rules for Future Changes

1. **Never use `<Teleport to="body">`** — always use `:to="teleportTarget"` with `:disabled="!teleportTarget"`
2. **Never add `contain: content` to `:host`** — it breaks `position: fixed`
3. **Google Places styles go in `custom-element.ts`** (injected into `document.head`), not in `style.css`
4. **Google Fonts go in `document.head`** — they work across Shadow DOM boundaries
5. **All new Vue components** that use `<Teleport>` must add:
   ```ts
   const teleportTarget = computed(() => window.__PROLEADSAI_TELEPORT__ || null)
   ```
6. **CSS in `style.css`** is loaded into the shadow root — theme CSS cannot interfere
