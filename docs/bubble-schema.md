# .bubble File Format Reference

## Overview

The `.bubble` export format is a proprietary JSON structure produced by Bubble.io's
"Export" feature (Settings → Export App). Files typically range from 1MB to 20MB+
depending on app complexity.

## Top-Level Structure

```json
{
  "type": "application",
  "_id": "app-unique-id",
  "app_version": "2.0",
  "creation_date": 1700000000000,
  "last_change_date": 1700000000000,

  "pages": { ... },
  "element_definitions": { ... },
  "api": { ... },
  "user_types": { ... },
  "option_sets": { ... },
  "styles": { ... },
  "settings": { ... },
  "_index": { ... }
}
```

## Pages

Each page is keyed by a short alphanumeric ID (e.g. `"cmchW0"`):

```json
"pages": {
  "cmchW0": {
    "id": "cmchW0",
    "name": "index",
    "type": "Page",
    "elements": { ... },
    "workflows": { ... }
  }
}
```

## Elements

Elements are nested — groups contain children via `elements`:

```json
"elements": {
  "cmchX0": {
    "id": "cmchX0",
    "type": "Group",
    "name": "Header Group",
    "elements": {
      "cmchY0": {
        "id": "cmchY0",
        "type": "Text",
        "properties": { ... }
      }
    }
  }
}
```

**Element types:**
- Built-in: `Group`, `Text`, `Button`, `Input`, `Image`, `Popup`, `FloatingGroup`, etc.
- Plugin elements: `1604083196447x185573648335896580-AAC` (long numeric timestamp ID)

## Workflows

```json
"workflows": {
  "cmciA0": {
    "id": "cmciA0",
    "type": "ButtonClicked",
    "properties": {
      "element_id": "cmchZ0"
    },
    "actions": {
      "0": {
        "type": "NavigateTo",
        "properties": { ... }
      }
    }
  }
}
```

**Trigger types:**
- `ButtonClicked` — `properties.element_id` = button element ID
- `PageLoaded` — always runs on page load
- `LoggedIn` / `LoggedOut` — auth events
- `InputChanged` — `properties.element_id` = input element ID
- `CustomEvent` — callable via "Trigger custom event" action
- `ConditionTrue` — runs when a condition becomes true
- `DoInterval` — recurring timer
- `1604083196447x...-AAe` — plugin event (trigger from plugin)
- `APIEvent` — backend workflow trigger
- `DatabaseTriggerEvent` — database trigger
- `RecurringEvent` — scheduled workflow

## Expressions

Bubble stores all dynamic references as expression trees:

```json
{
  "type": "Search",
  "properties": {
    "type_to_find": "custom.user"
  },
  "next": {
    "type": "Message",
    "name": "first_element",
    "is_slidable": false,
    "next": {
      "type": "Message",
      "name": "email_text",
      "is_slidable": false
    }
  }
}
```

This encodes: `Do a search for Users:first item's email`

Key expression types:
- `Search` — database search
- `GetElement` — reference to a UI element's value
- `CurrentUser` — the currently logged-in user
- `Message` — method call on previous expression result
- `APIEventParameter` — parameter passed to an API workflow
- `OptionValue` — accessing an option set value
- `InjectedValue` — server-injected value (current user, page data)

## Data Types

```json
"user_types": {
  "user": {
    "display": "User",
    "fields": {
      "email_text": {
        "display": "[User] email",
        "value": "text"
      },
      "profile_image_image": {
        "display": "profile image",
        "value": "image"
      }
    }
  }
}
```

Field types: `text`, `number`, `boolean`, `image`, `file`, `date`, `address`,
`geographic_address`, `custom.typename` (relation), `list_custom.typename` (list of type)

## Option Sets

```json
"option_sets": {
  "status": {
    "display": "Status",
    "values": {
      "active": { "display": "Active", "db_value": "active", "sort_factor": 1 },
      "inactive": { "display": "Inactive", "db_value": "inactive", "sort_factor": 2 }
    },
    "attributes": {
      "color_text": { "display": "Color", "value": "text" }
    }
  }
}
```

## Plugins

Plugins are stored as a map in `settings.client_safe.plugins`:

```json
"settings": {
  "client_safe": {
    "plugins": {
      "1604083196447x185573648335896580": true,
      "1723214495770x163075407351644160": true
    }
  }
}
```

Plugin IDs are long timestamp-based numeric strings. When a plugin element is placed
on a page, its `type` field starts with the plugin ID (e.g. `1604083196447x185573648335896580-AAC`).

## Reusable Elements

```json
"element_definitions": {
  "cmchZ0": {
    "id": "cmchZ0",
    "name": "#header",
    "type": "CustomElement",
    "elements": { ... },
    "workflows": { ... }
  }
}
```

Reusable elements have their own element tree and workflows, just like pages.
They are referenced on pages via elements with `type: "CustomElement"`.
