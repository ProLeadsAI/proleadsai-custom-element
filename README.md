# ProLeadsAI Roof Estimator Widget

A Vue 3 custom element widget for the ProLeadsAI roof estimation tool. This widget can be embedded in any website, including WordPress.

## Quick Start

```sh
pnpm install
pnpm dev
```

Open `http://localhost:5173/?orgId=YOUR_ORG_ID` to test locally.

---

## Custom Element Props

The `<roof-estimator>` custom element accepts the following attributes:

| Attribute | Required | Description | Default |
|-----------|----------|-------------|---------|
| `org-id` | Yes | Organization ID from ProLeadsAI | `""` |
| `api-url` | No | API base URL | `https://next.proleadsai.com/api` |
| `google-maps-api-key` | No | Google Maps API key for Places autocomplete | Built-in key |
| `primary-color` | No | Primary theme color (hex) | `#1d4ed8` |

### Example Usage

```html
<roof-estimator
  org-id="019ae633-22f9-764f-99d0-19c92d7e5261"
  api-url="https://next.proleadsai.com/api"
  google-maps-api-key="YOUR_GOOGLE_MAPS_API_KEY"
  primary-color="#1d4ed8"
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
    apiBaseUrl: this.getAttribute('api-url') || 'https://next.proleadsai.com/api',
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
    api-url="${config.apiUrl || 'https://next.proleadsai.com/api'}"
    google-maps-api-key="${config.googleMapsApiKey || ''}"
    primary-color="${config.primaryColor || '#1d4ed8'}"
    new-prop="${config.newProp || ''}"
  ></roof-estimator>
`;
```

### 4. Update WordPress PHP to pass the setting (`proleadsai-wppb/public/class-proleadsai-public.php`)

```php
wp_localize_script( $this->plugin_name . '-widget-launcher', 'proleadsaiWidget', array(
  'apiUrl' => 'https://next.proleadsai.com/api',
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
