# PF1e Automatic Triggers

A Foundry VTT module for the PF1 system that automatically executes actions on items when combat lifecycle events occur. Set flags on any item to have it respond to combat start, combat end, turn changes, or new rounds.

**Version:** 1.0.0  
**Foundry VTT Compatibility:** v13  
**Manifest URL:** `https://github.com/Hamilcarbarcas/pf1-automatic-triggers/releases/latest/download/module.json`

## Features

- **Combat Lifecycle Triggers**: React to five distinct combat events:
  - **Combat Start** — When combat begins
  - **Combat End** — When the combat encounter is deleted/ended
  - **Turn Start** — When an actor's turn begins
  - **Turn End** — When an actor's turn ends
  - **Round Start** — When a new round begins (affects all combatants)

- **Configurable Actions**: Each trigger can perform one of five actions:
  - **`use`** — Deduct one charge from the item
  - **`toggle`** — Flip the item's active state
  - **`on`** — Activate the item
  - **`off`** — Deactivate the item
  - **`delete`** — Remove the item from the actor

- **Multiple Triggers**: A single item can have triggers for multiple events
- **GM-Only Processing**: All trigger logic runs on the GM client to avoid duplicate execution

## Usage

### Setting Triggers via Macro or Script

Triggers are stored as flags on items. Use `setFlag` to configure them:

```js
// Delete a buff when combat ends
await item.setFlag("pf1-automatic-triggers", "triggers", {
  onCombatEnd: "delete"
});

// Deduct a charge each turn and delete when combat ends
await item.setFlag("pf1-automatic-triggers", "triggers", {
  onTurnStart: "use",
  onCombatEnd: "delete"
});

// Toggle a buff on/off at the start of the actor's turn
await item.setFlag("pf1-automatic-triggers", "triggers", {
  onTurnStart: "toggle"
});

// Activate at combat start, deactivate at combat end
await item.setFlag("pf1-automatic-triggers", "triggers", {
  onCombatStart: "on",
  onCombatEnd: "off"
});
```

### Removing Triggers

```js
// Remove all triggers from an item
await item.unsetFlag("pf1-automatic-triggers", "triggers");

// Remove a single trigger (set it to null)
await item.setFlag("pf1-automatic-triggers", "triggers", {
  onTurnStart: null
});
```

### Trigger Reference

| Flag Key | Event | Scope |
|---|---|---|
| `onCombatStart` | Combat begins | All combatant actors |
| `onCombatEnd` | Combat tracker is deleted | All combatant actors |
| `onTurnStart` | A combatant's turn begins | That actor only |
| `onTurnEnd` | A combatant's turn ends | That actor only |
| `onRoundStart` | A new round begins | All combatant actors |

### Action Reference

| Action | Effect |
|---|---|
| `use` | Uses the item |
| `toggle` | Toggles the item's active state |
| `on` | Sets the item to active |
| `off` | Sets the item to inactive |
| `delete` | Removes the item from the actor |

## Compatibility

- **Minimum Foundry Version**: 13
- **Verified Version**: 13
- **Required System**: Pathfinder 1e
