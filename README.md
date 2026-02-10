# ProLeadsAI Roof Estimator Widget

A Vue 3 **Custom Element** (`<roof-estimator>`) that provides an embeddable roof-estimate / lead-capture widget.

It supports:

- **Floating button + side panel** mode
- **Inline embed** mode
- Theme controls (colors, fonts, hero image)
- Safe, optional font-size overrides

This repo builds the standalone widget assets used by the WordPress plugin, but the same widget can be embedded on:

- Plain HTML sites
- React / Vue apps
- Site builders like Wix, Webflow, Framer, Squarespace (via custom code / embed blocks)

## Quick Start (local development)

```sh
pnpm install
pnpm dev
```

Open `http://localhost:5173/?orgId=YOUR_ORG_ID` to test locally.

Notes:

- In production, you typically load `dist/proleadsai-widget.iife.js` + `dist/proleadsai-widget.css` and then add the `<roof-estimator>` tag.
- The widget does **not** use Shadow DOM.

---

## Embedding on plain HTML sites

### 1) Host the build assets

Build the widget:

```sh
pnpm install
pnpm build
```

This outputs:

- `dist/proleadsai-widget.iife.js`
- `dist/proleadsai-widget.css`

Host those two files somewhere public (your site, S3, CDN, etc.).

### 2) Add to your site

```html
<!-- In <head> -->
<link rel="stylesheet" href="https://YOUR-CDN/proleadsai-widget.css" />

<!-- Before closing </body> -->
<script src="https://YOUR-CDN/proleadsai-widget.iife.js"></script>

<!-- Wherever you want the widget -->
<roof-estimator
  org-id="YOUR_ORG_ID"
  display-mode="inline"
  heading="Free Roof Estimate Instantly"
></roof-estimator>
```

## Embedding on Wix / Framer / other builders

General approach (works for most builders):

- Add the CSS + JS in the builder’s **Site Code / Custom Code / Head** area.
- Add the `<roof-estimator>` tag inside an **Embed HTML** block where you want it to appear.

If the builder strips custom tags, use an HTML embed block that allows raw HTML, or inject the element via JavaScript.

## Embedding in React / Vue

Because this is a Custom Element, you can use it as a normal HTML tag.

- Ensure the CSS + JS bundle are loaded once (e.g. in `index.html` or via your bundler’s static assets).
- Then render `<roof-estimator ... />` in your component tree.

React note: React will pass unknown attributes through to the DOM, so you can use the attributes as written below.

Vue note: if you are using Vue templates, you may need to treat it as a custom element in Vue config depending on your setup.

---

## Custom element attributes (props)

The `<roof-estimator>` custom element reads the following attributes (see `src/custom-element.ts`).

### Core

| Attribute | Required | Description | Default |
|---|---:|---|---|
| `org-id` | Yes | ProLeadsAI organization/team id | `""` |
| `api-url` | No | API base URL | `https://app.proleadsai.com/api` |
| `google-maps-api-key` | No | Google Maps key for Places Autocomplete | `""` |

### Display mode

| Attribute | Required | Description | Default |
|---|---:|---|---|
| `display-mode` | No | `inline` or `floating` | `inline` |

### Floating button settings (only used when `display-mode="floating"`)

| Attribute | Required | Description | Default |
|---|---:|---|---|
| `button-text` | No | Floating button label | `Get Roof Estimate` |
| `button-emoji` | No | Emoji shown on the button | `🏠` |
| `button-position` | No | `bottom-right`, `bottom-left`, `bottom-center`, `left-edge`, `right-edge` | `bottom-right` |

### Colors

| Attribute | Required | Description | Default |
|---|---:|---|---|
| `primary-color` | No | Primary theme color (used for floating button background) | `#facc15` |
| `text-color` | No | Floating button text color | `#1c1917` |

### Inline/hero content

| Attribute | Required | Description | Default |
|---|---:|---|---|
| `heading` | No | Section heading text | `""` |
| `subheading` | No | Section subheading text | `""` |
| `hero-image` | No | Hero image URL. Use `none` to hide. | `""` |

### Background

| Attribute | Required | Description | Default |
|---|---:|---|---|
| `bg-style` | No | `none`, `light`, `dark`, `custom` | `none` |
| `bg-color` | No | Background color if `bg-style="custom"` | `#f5f5f4` |

### Margins (inline embeds)

| Attribute | Required | Description | Default |
|---|---:|---|---|
| `margin-top` | No | CSS length (e.g. `40px`, `2rem`) | `""` |
| `margin-bottom` | No | CSS length (e.g. `40px`, `2rem`) | `""` |

### Typography

| Attribute | Required | Description | Default |
|---|---:|---|---|
| `heading-font` | No | Google Font family name for heading | `""` |
| `heading-color` | No | Heading text color | `#1c1917` |
| `heading-size` | No | Heading font-size override (safe units only) | `""` |
| `text-font` | No | Google Font family name for body text | `""` |
| `text-color-shortcode` | No | Body text color | `#44403c` |
| `text-size` | No | Body text font-size override (safe units only) | `""` |

Notes:

- `text-color-shortcode` is used for body text color. `text-color` is reserved for the floating button.
- Font sizes only accept safe CSS lengths (e.g. `14px`, `1.125rem`, `120%`). Invalid values are ignored.

### Example: inline embed

```html
<roof-estimator
  org-id="YOUR_ORG_ID"
  display-mode="inline"
  heading="Free Roof Estimate Instantly"
  bg-style="custom"
  bg-color="#f5f5f4"
  heading-font="Inter"
  heading-color="#1c1917"
  text-font="Inter"
  text-color-shortcode="#44403c"
></roof-estimator>
```

### Example: floating button + side panel

```html
<roof-estimator
  org-id="YOUR_ORG_ID"
  display-mode="floating"
  button-text="Get Roof Estimate"
  button-emoji="🏠"
  button-position="bottom-right"
  primary-color="#ffd400"
  text-color="#1d1616"
  heading="Free Roof Estimate Instantly"
></roof-estimator>
```

---

## Adding New Props

To add a new prop to the widget:

### 1. Update the config type (`src/utils/config.ts`)

```typescript
export interface WidgetConfig {
  orgId: string
  apiBaseUrl: string
  googleMapsApiKey: string
  primaryColor: string
  newProp: string  // Add your new prop
}
```

### 2. Update the custom element to read the attribute (`src/custom-element.ts`)

```typescript
connectedCallback() {
  const config = {
    orgId: this.getAttribute('org-id') || '',
    apiBaseUrl: this.getAttribute('api-url') || 'https://app.proleadsai.com/api',
    googleMapsApiKey: this.getAttribute('google-maps-api-key') || '',
    primaryColor: this.getAttribute('primary-color') || '#1d4ed8',
    newProp: this.getAttribute('new-prop') || 'default-value',  // Add here
  }
  window.__PROLEADSAI_CONFIG__ = config
}
```

### 3. Update the WordPress launcher (`proleadsai-wppb/public/js/proleadsai-widget-launcher.js`)

```javascript
panelElement.innerHTML = `
  <roof-estimator
    org-id="${config.orgId || ''}"
    api-url="${config.apiUrl || 'https://app.proleadsai.com/api'}"
    google-maps-api-key="${config.googleMapsApiKey || ''}"
    primary-color="${config.primaryColor || '#1d4ed8'}"
    new-prop="${config.newProp || ''}"
  ></roof-estimator>
`;
```

### 4. Update WordPress PHP to pass the setting (`proleadsai-wppb/public/class-proleadsai-public.php`)

```php
wp_localize_script( $this->plugin_name . '-widget-launcher', 'proleadsaiWidget', array(
  'apiUrl' => 'https://app.proleadsai.com/api',
  'orgId' => $settings['team_id'] ?? '',
  'googleMapsApiKey' => $settings['google_maps_api_key'] ?? '',
  'primaryColor' => $settings['primary_color'] ?? '#1d4ed8',
  'newProp' => $settings['new_prop'] ?? '',  // Add here
));
```

---

## Building for Production

```sh
pnpm build
```

This outputs:
- `dist/proleadsai-widget.iife.js` - The widget JavaScript
- `dist/proleadsai-widget.css` - The widget styles (Tailwind CSS)

---

## Deploying to WordPress Plugin

After building, copy the files to the WordPress plugin:

```sh
# From this directory
cp dist/proleadsai-widget.iife.js ../proleadsai-wppb/public/js/proleadsai-widget-ce.js
cp dist/proleadsai-widget.css ../proleadsai-wppb/public/css/proleadsai-widget.css
```

Or run this one-liner:

```sh
pnpm build && cp dist/proleadsai-widget.iife.js ../proleadsai-wppb/public/js/proleadsai-widget-ce.js && cp dist/proleadsai-widget.css ../proleadsai-wppb/public/css/proleadsai-widget.css
```

---

## Project Structure

```
src/
├── components/
│   ├── RoofEstimateHero.vue      # Main hero with address search
│   ├── RoofResultModal.vue       # Results modal with map & stats
│   ├── RoofMapViewer.vue         # Google Maps with draggable marker
│   └── ResultModalContactForm.vue # Lead capture form
├── utils/
│   ├── api.ts                    # API calls (getRoofEstimate, submitForm)
│   ├── config.ts                 # Config management (reads from window.__PROLEADSAI_CONFIG__)
│   └── maps.ts                   # Google Maps loader
├── types/
│   └── google-maps.d.ts          # TypeScript declarations
├── App.vue                       # Main app wrapper
├── custom-element.ts             # Custom element entry point
├── main.ts                       # Standard Vue entry (for dev)
└── style.css                     # Tailwind CSS import
```

---

## Local Development with URL Params

For local testing without WordPress, you can pass config via URL params:

```
http://localhost:5173/?orgId=YOUR_ORG_ID
```

The config utility (`src/utils/config.ts`) will read `orgId` and `teamId` from URL params as a fallback.

---

## WordPress Plugin Files

The WordPress plugin expects these files:

| WordPress Path | Source |
|----------------|--------|
| `public/js/proleadsai-widget-ce.js` | `dist/proleadsai-widget.iife.js` |
| `public/css/proleadsai-widget.css` | `dist/proleadsai-widget.css` |
| `public/js/proleadsai-widget-launcher.js` | Launcher script (opens slide-out panel) |

---

## Events

The widget dispatches custom events:

| Event | Description |
|-------|-------------|
| `proleadsai:modal-open` | Fired when the results modal opens (used to close the slide-out panel) |

---

## Styling

The widget uses Tailwind CSS. All styles are scoped and bundled into the CSS file. The widget does NOT use Shadow DOM, so styles from the parent page may affect it (and vice versa).
