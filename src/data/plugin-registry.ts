/**
 * Plugin Registry — maps known Bubble plugin IDs to human-readable names.
 * Plugin IDs are long timestamp-based numeric strings assigned by Bubble.
 *
 * To add a plugin: find its ID in Settings → Plugins (inspect the .bubble export),
 * then add an entry below.
 */

export interface PluginInfo {
  name: string;
  category: 'ui' | 'api' | 'payment' | 'auth' | 'analytics' | 'utility' | 'media' | 'map' | 'data';
  url?: string;
}

const PLUGIN_REGISTRY: Record<string, PluginInfo> = {
  // ─── UI Components ────────────────────────────────────────────────────────
  '1604083196447x185573648335896580': { name: 'Ionic Elements', category: 'ui', url: 'https://bubble.io/plugin/ionic-elements-1604083196447x185573648335896580' },
  '1586272281734x700432649088565200': { name: 'Lottie Animations', category: 'ui' },
  '1607843728978x584688751086903300': { name: 'Rich Text Editor', category: 'ui' },
  '1528796993432x840000000000000000': { name: 'Air Date/Time Picker', category: 'ui' },
  '1561533641428x798682748699852800': { name: 'Star Rating', category: 'ui' },
  '1610534577332x600000000000000000': { name: 'Draggable Elements', category: 'ui' },
  '1519044986010x688580560913530900': { name: 'Chart.js', category: 'ui' },
  '1533840052530x400000000000000000': { name: 'Slider Input', category: 'ui' },
  '1552158032985x395680220219523070': { name: 'Progress Bar', category: 'ui' },
  '1566644269487x256034538218029060': { name: 'Color Picker', category: 'ui' },
  '1598991897447x200000000000000000': { name: 'Countdown Timer', category: 'ui' },
  '1605201810829x400000000000000000': { name: 'Kanban Board', category: 'ui' },
  '1519739984673x813004790741434400': { name: 'Select2 Dropdown', category: 'ui' },

  // ─── API & Integrations ───────────────────────────────────────────────────
  '1495796617539x519660818917711900': { name: 'API Connector', category: 'api' },
  '1723214495770x163075407351644160': { name: 'API Connector 2', category: 'api' },
  '1554069974668x686012534411182100': { name: 'Zapier', category: 'api' },
  '1617823155936x600000000000000000': { name: 'Airtable', category: 'api' },
  '1603923350153x900000000000000000': { name: 'Notion Integration', category: 'api' },
  '1617905167888x700000000000000000': { name: 'Slack Integration', category: 'api' },

  // ─── Payment ─────────────────────────────────────────────────────────────
  '1476822950457x632962508451020800': { name: 'Stripe', category: 'payment', url: 'https://bubble.io/plugin/stripe-1476822950457x632962508451020800' },
  '1619018067782x600000000000000000': { name: 'Stripe.js (v3)', category: 'payment' },
  '1554756982476x750000000000000000': { name: 'PayPal', category: 'payment' },
  '1605282938985x800000000000000000': { name: 'Paddle', category: 'payment' },

  // ─── Authentication ───────────────────────────────────────────────────────
  '1485434093360x694949160941297700': { name: 'Google OAuth', category: 'auth' },
  '1485435174812x946712804566048800': { name: 'Facebook Login', category: 'auth' },
  '1551898424618x700000000000000000': { name: 'Apple Sign In', category: 'auth' },
  '1562185285019x600000000000000000': { name: 'LinkedIn OAuth', category: 'auth' },
  '1568055616000x600000000000000000': { name: 'Twitter OAuth', category: 'auth' },
  '1604490523752x900000000000000000': { name: 'Magic Link (Passwordless)', category: 'auth' },

  // ─── Analytics ────────────────────────────────────────────────────────────
  '1554731898560x400000000000000000': { name: 'Google Analytics 4', category: 'analytics' },
  '1605548000000x500000000000000000': { name: 'Mixpanel', category: 'analytics' },
  '1603299920000x600000000000000000': { name: 'Segment', category: 'analytics' },
  '1617000000000x700000000000000000': { name: 'Hotjar', category: 'analytics' },
  '1610000000000x800000000000000000': { name: 'Intercom', category: 'analytics' },

  // ─── Maps ─────────────────────────────────────────────────────────────────
  '1496674603532x719158965823553500': { name: 'Google Maps', category: 'map' },
  '1529695866940x900000000000000000': { name: 'Mapbox', category: 'map' },

  // ─── Media ───────────────────────────────────────────────────────────────
  '1609798505018x600000000000000000': { name: 'Cloudinary', category: 'media' },
  '1605290000000x700000000000000000': { name: 'Video.js Player', category: 'media' },
  '1614000000000x400000000000000000': { name: 'Vimeo Player', category: 'media' },
  '1602000000000x800000000000000000': { name: 'YouTube Player', category: 'media' },
  '1523643753699x558963124193042400': { name: 'AddToAny Share', category: 'utility' },

  // ─── Utility ─────────────────────────────────────────────────────────────
  '1614616248855x400000000000000000': { name: 'PDF Conjurer', category: 'utility' },
  '1555263986690x500000000000000000': { name: 'Toolbox', category: 'utility' },
  '1612996000000x600000000000000000': { name: 'JSON & CSV Utilities', category: 'utility' },
  '1598000000000x700000000000000000': { name: 'Date & Time Utilities', category: 'utility' },
  '1553000000000x800000000000000000': { name: 'Text Utilities', category: 'utility' },
  '1600000000000x900000000000000000': { name: 'QR Code Generator', category: 'utility' },

  // ─── Data ─────────────────────────────────────────────────────────────────
  '1556000000000x300000000000000000': { name: 'Algolia Search', category: 'data' },
  '1609000000000x400000000000000000': { name: 'Xano', category: 'data' },
  '1571000000000x500000000000000000': { name: 'PostgreSQL Connector', category: 'data' },
};

/**
 * Returns the human-readable name for a given Bubble plugin ID.
 * Returns undefined if the plugin is not in the registry.
 */
export function getPluginName(pluginId: string): string | undefined {
  return PLUGIN_REGISTRY[pluginId]?.name;
}

/**
 * Returns the full plugin info for a given Bubble plugin ID.
 */
export function getPluginInfo(pluginId: string): PluginInfo | undefined {
  return PLUGIN_REGISTRY[pluginId];
}

/**
 * Returns all known plugin IDs in the registry.
 */
export function getAllKnownPluginIds(): string[] {
  return Object.keys(PLUGIN_REGISTRY);
}
