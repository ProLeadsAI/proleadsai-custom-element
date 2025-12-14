// Google Maps Dynamic Library Import loader
// Following Google's recommended pattern: https://developers.google.com/maps/documentation/javascript/load-maps-js-api

let bootstrapPromise: Promise<void> | null = null

/**
 * Initialize the Google Maps bootstrap loader (Dynamic Library Import pattern).
 * This sets up google.maps.importLibrary() which can then load any library on demand.
 */
export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in browser'))

  // If importLibrary is already available, we're good
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (window.google?.maps && typeof (window.google.maps as any).importLibrary === 'function') {
    return Promise.resolve()
  }

  // If Maps JS is present but WITHOUT importLibrary (loaded by another plugin/theme the old way)
  if (window.google?.maps) {
    console.warn(
      '[ProLeadsAI] Google Maps JS was already loaded without the Dynamic Library Import API. ' +
        'This may have been loaded by another plugin/theme. Places autocomplete may not work.'
    )
    return Promise.resolve()
  }

  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = new Promise((resolve, reject) => {
    // Google's recommended inline bootstrap loader (minified)
    // This sets up google.maps.importLibrary() immediately, then loads the API on first use
    /* eslint-disable */
    ((g: { key: string; v: string }) => {
      // @ts-ignore
      var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window;
      // @ts-ignore
      b = b[c] || (b[c] = {});
      // @ts-ignore
      var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => {
        // @ts-ignore
        await (a = m.createElement("script"));
        e.set("libraries", [...r] + "");
        // @ts-ignore
        for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]);
        e.set("callback", c + ".maps." + q);
        // @ts-ignore
        a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
        // @ts-ignore
        d[q] = f;
        // @ts-ignore
        a.onerror = () => h = n(Error(p + " could not load."));
        // @ts-ignore
        a.nonce = m.querySelector("script[nonce]")?.nonce || "";
        m.head.append(a);
      }));
      // @ts-ignore
      d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f: string, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n));
    })({
      key: apiKey,
      v: "weekly"
    });
    /* eslint-enable */

    // The bootstrap is synchronous - importLibrary is now available
    resolve()
  })

  return bootstrapPromise
}
