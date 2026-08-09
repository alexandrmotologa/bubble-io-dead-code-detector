// ─────────────────────────────────────────────────────────────────────────────
// Bubble.io Dead Code Detector — Real schema types
// Reverse-engineered from actual .bubble export files
// ─────────────────────────────────────────────────────────────────────────────

/** Top-level structure of a .bubble export file */
export interface BubbleApp {
  type: 'application';
  _id: string;
  app_version: string;
  last_change: string;
  creation_date: number;
  last_change_date: number;
  hardcode_stored_expanded?: boolean;

  /** Pages (key = page id, value = BubblePage) */
  pages: Record<string, BubblePage>;

  /** Reusable elements (key = element id, value = BubbleReusableElement) */
  element_definitions: Record<string, BubbleReusableElement>;

  /** API / Backend Workflows (key = workflow id, value = BubbleApiWorkflow) */
  api: Record<string, BubbleApiWorkflow>;

  /** Internal index used by Bubble for fast lookups */
  _index: BubbleIndex;

  /** App settings (client_safe and secure portions) */
  settings: BubbleSettings;

  /** Data types / tables (key = type slug, value = BubbleDataType) */
  user_types: Record<string, BubbleDataType>;

  /** Option Sets (key = option set slug, value = BubbleOptionSet) */
  option_sets: Record<string, BubbleOptionSet>;

  /** Mobile views */
  mobile_views?: Record<string, unknown>;

  /** Styles (key = style id, value = BubbleStyle) */
  styles: Record<string, BubbleStyle>;

  favicon?: string;
  comments?: Record<string, string>;
  screenshot?: { screenshot: string; last_update: number };
  template_id?: string;
  closest_ancestor_snapshots?: Record<string, unknown>;
}

// ─── Pages ────────────────────────────────────────────────────────────────────

export interface BubblePage {
  id: string;
  name: string;
  type: 'Page';
  /** UI element tree (flat map keyed by element id) */
  elements: Record<string, BubbleElement>;
  /** Page-level workflows keyed by workflow id */
  workflows: Record<string, BubbleWorkflow>;
  properties?: Record<string, unknown>;
}

// ─── Elements ─────────────────────────────────────────────────────────────────

export interface BubbleElement {
  id: string;
  /** Bubble element type (e.g. 'Group', 'Button', 'Text', or plugin element id) */
  type: string;
  /** Human-readable default name */
  default_name?: string;
  /** Custom name set by developer */
  name?: string;
  /** Child elements (nested groups, etc.) */
  elements?: Record<string, BubbleElement>;
  /** Conditional states applied to the element */
  states?: Record<string, BubbleElementState>;
  /** Element properties (layout, visibility, data source, etc.) */
  properties?: BubbleElementProperties;
  /** Custom states defined on this element */
  custom_states?: Record<string, unknown>;
  /** Style reference id */
  style?: string;
  /** Parent element reference */
  current_parent?: string;
  color_tokens?: Record<string, unknown>;
}

export interface BubbleElementProperties {
  is_visible?: boolean;
  collapse_when_hidden?: boolean;
  data_source?: BubbleExpression;
  group_type?: string;
  text?: BubbleTextExpression;
  src?: BubbleTextExpression;
  height?: number;
  width?: number;
  left?: number;
  top?: number;
  zindex?: number;
  [key: string]: unknown;
}

export interface BubbleElementState {
  type: 'State';
  condition?: BubbleExpression;
  properties?: Partial<BubbleElementProperties>;
}

// ─── Reusable Elements ────────────────────────────────────────────────────────

export interface BubbleReusableElement {
  id: string;
  name: string;
  type: string;
  elements: Record<string, BubbleElement>;
  workflows: Record<string, BubbleWorkflow>;
  properties?: Record<string, unknown>;
  states?: Record<string, BubbleElementState>;
  custom_states?: Record<string, unknown>;
}

// ─── Workflows ────────────────────────────────────────────────────────────────

export type BubbleWorkflowTriggerType =
  | 'ButtonClicked'
  | 'PageLoaded'
  | 'LoggedIn'
  | 'LoggedOut'
  | 'InputChanged'
  | 'ConditionTrue'
  | 'CustomEvent'
  | 'DoInterval'
  | 'OnPageError'
  | string; // plugin event types like '1604083196447x...-AAe'

export interface BubbleWorkflow {
  id: string;
  /** Trigger type — determines if this is a dead workflow */
  type: BubbleWorkflowTriggerType;
  /** Properties (e.g. element_id for ButtonClicked) */
  properties?: {
    element_id?: string;
    event_name?: string;
    condition?: BubbleExpression;
    [key: string]: unknown;
  };
  /** Actions executed by this workflow, keyed by index or id */
  actions: Record<string, BubbleAction>;
}

// ─── API / Backend Workflows ──────────────────────────────────────────────────

export interface BubbleApiWorkflow {
  id: string;
  /** 'APIEvent' | 'DatabaseTriggerEvent' | 'RecurringEvent' */
  type: string;
  properties?: {
    condition?: BubbleExpression;
    name?: string;
    [key: string]: unknown;
  };
  actions: Record<string, BubbleAction>;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface BubbleAction {
  id?: string;
  type?: string;
  properties?: Record<string, BubbleExpression | unknown>;
  condition?: BubbleExpression;
}

// ─── Expressions (Bubble's dynamic data system) ───────────────────────────────

export interface BubbleExpression {
  type: string; // 'Search', 'CurrentUser', 'PageData', 'ElementParent', 'ThisElement', 'InjectedValue', 'GetElement', 'GetParamFromUrl', 'OptionValue', 'APIEventParameter', ...
  next?: BubbleExpression;
  args?: unknown;
  properties?: {
    type_to_find?: string;       // data type slug for searches
    name?: string;               // field name / property name
    element_id?: string;         // element reference
    option_set?: string;         // option set reference
    option_value?: string;
    text_id?: string;            // AppText reference
    btype_id?: string;
    event_id?: string;
    param_id?: string;
    value?: string;
    parameter_name?: BubbleTextExpression;
    constraints?: Record<string, unknown>;
    [key: string]: unknown;
  };
  said?: string;                 // encoded string (base64) for app id reference
  is_slidable?: boolean;
  name?: string;                 // message/method name (e.g. 'equals', 'first_element')
}

export interface BubbleTextExpression {
  type: 'TextExpression';
  entries: Record<string, string | BubbleExpression>;
}

// ─── Data Types ───────────────────────────────────────────────────────────────

export interface BubbleDataType {
  /** Display name of the data type */
  display: string;
  /** Fields keyed by field slug (e.g. 'email_text', 'name_text') */
  fields: Record<string, BubbleField>;
  exposed_api?: unknown;
  privacy_role?: unknown;
}

export interface BubbleField {
  /** Human readable display name (e.g. '[app]email') */
  display: string;
  /** Field type: 'text', 'number', 'boolean', 'image', 'file', 'date', 'list_text', 'custom.typename' */
  value: string;
}

// ─── Option Sets ──────────────────────────────────────────────────────────────

export interface BubbleOptionSet {
  /** Display name */
  display: string;
  /** Options keyed by option id */
  values: Record<string, BubbleOptionValue>;
  /** Attributes/fields defined on options */
  attributes?: Record<string, BubbleOptionAttribute>;
}

export interface BubbleOptionValue {
  display: string;
  db_value: string;
  sort_factor?: number;
  [key: string]: unknown;
}

export interface BubbleOptionAttribute {
  display: string;
  value: string;
  creation_source?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

export interface BubbleStyle {
  id: string;
  name?: string;
  element_type?: string;
  properties?: Record<string, unknown>;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface BubbleSettings {
  client_safe: {
    plugins?: Record<string, boolean | BubblePlugin>;
    text?: Record<string, unknown>;
    fonts?: unknown;
    project?: unknown;
    app_rights?: unknown;
    admin_email?: string;
    app_language?: string;
    general_keys?: Record<string, unknown>;
    feature_flags?: Record<string, unknown>;
    [key: string]: unknown;
  };
  secure: {
    api_tokens?: Record<string, unknown>;
    general_keys?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface BubblePlugin {
  id?: string;
  name?: string;
  version?: string;
  [key: string]: unknown;
}

// ─── Index ────────────────────────────────────────────────────────────────────

export interface BubbleIndex {
  id_to_path?: Record<string, string>;
  issues_sub?: Record<string, unknown>;
  issues_list?: Record<string, BubbleIssue[]>;
  page_name_to_id?: Record<string, string>;
  custom_name_to_id?: Record<string, string>;
  page_name_to_path?: Record<string, string>;
}

export interface BubbleIssue {
  type: string;
  message?: string;
  path?: string;
}

// ─── Internal parsed representation ──────────────────────────────────────────

/** Parsed & normalized representation of a Bubble app, ready for analysis */
export interface ParsedBubbleApp {
  meta: {
    id: string;
    version: string;
    lastChange: Date;
    createdAt: Date;
  };
  pages: ParsedPage[];
  reusableElements: ParsedReusableElement[];
  apiWorkflows: ParsedApiWorkflow[];
  dataTypes: ParsedDataType[];
  optionSets: ParsedOptionSet[];
  styles: ParsedStyle[];
  plugins: ParsedPlugin[];
  existingIssues: BubbleIssue[];
}

export interface ParsedPage {
  id: string;
  name: string;
  elements: ParsedElement[];
  workflows: ParsedWorkflow[];
}

export interface ParsedReusableElement {
  id: string;
  name: string;
  elements: ParsedElement[];
  workflows: ParsedWorkflow[];
}

export interface ParsedElement {
  id: string;
  type: string;
  name: string;
  pageId: string;
  parentId?: string;
  isVisible: boolean;
  isPermanentlyHidden: boolean;
  referencedDataTypeSlug?: string;
  referencedFieldSlugs: string[];
  referencedOptionSets: string[];
  referencedStyles: string[];
  referencedElementIds: string[];
  children: ParsedElement[];
  hasConditions: boolean;
  conditionCount: number;
  isPluginElement: boolean;
  pluginId?: string;
}

export interface ParsedWorkflow {
  id: string;
  name: string;
  triggerType: BubbleWorkflowTriggerType;
  triggerElementId?: string;
  isCustomEvent: boolean;
  isServerSide: boolean;
  actionCount: number;
  referencedDataTypeSlug?: string;
  referencedFieldSlugs: string[];
  referencedOptionSets: string[];
  referencedElementIds: string[];
  parentId: string; // page id or reusable element id
  parentType: 'page' | 'reusable_element';
}

export interface ParsedApiWorkflow {
  id: string;
  name: string;
  type: string;
  actionCount: number;
  referencedDataTypeSlug?: string;
  referencedFieldSlugs: string[];
  referencedOptionSets: string[];
}

export interface ParsedDataType {
  id: string;        // slug key from user_types
  name: string;      // display name
  fields: ParsedField[];
  hasPrivacyRules: boolean;
  isExposedViaApi: boolean;
}

export interface ParsedField {
  id: string;        // slug key from fields
  name: string;      // display name
  type: string;      // 'text', 'number', etc.
  dataTypeId: string;
  isRelational: boolean;
  relatedTypeId?: string;
}

export interface ParsedOptionSet {
  id: string;
  name: string;
  optionCount: number;
  attributeCount: number;
}

export interface ParsedStyle {
  id: string;
  name: string;
  elementType?: string;
}

export interface ParsedPlugin {
  id: string;
  name: string;
  isActive: boolean;
}
