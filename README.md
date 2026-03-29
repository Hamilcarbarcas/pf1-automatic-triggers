# PF1e Automatic Triggers

A Foundry VTT module for the PF1 system that automatically executes actions on items when combat lifecycle events occur. 

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
  - **`use`** — Uses the item (full use flow — script calls, chat output, charge deduction)
  - **`toggle`** — Flip the item's active state
  - **`on`** — Activate the item
  - **`off`** — Deactivate the item
  - **`delete`** — Remove the item from the actor

- **Multiple Triggers**: A single item can have flags for multiple events
- **GM-Only Processing**: All trigger logic runs on the GM client to avoid duplicate execution

## Usage

### Setting Triggers via the Item Sheet

1. Open the item in the PF1 item sheet
2. Go to the **Advanced** tab
3. Add a **boolean flag** with the name `{trigger}_{action}`

For example, adding the boolean flag `onCombatEnd_delete` will delete the item when combat ends.

### Flag Name Format

Flags follow the pattern: **`{trigger}_{action}`**

### Trigger + Action Reference

| Boolean Flag Name | When | What It Does |
|---|---|---|
| `onCombatStart_use` | Combat begins | Uses the item |
| `onCombatStart_toggle` | Combat begins | Toggles active state |
| `onCombatStart_on` | Combat begins | Activates the item |
| `onCombatStart_off` | Combat begins | Deactivates the item |
| `onCombatStart_delete` | Combat begins | Deletes the item |
| `onCombatEnd_use` | Combat ends | Uses the item |
| `onCombatEnd_toggle` | Combat ends | Toggles active state |
| `onCombatEnd_on` | Combat ends | Activates the item |
| `onCombatEnd_off` | Combat ends | Deactivates the item |
| `onCombatEnd_delete` | Combat ends | Deletes the item |
| `onTurnStart_use` | Actor's turn begins | Uses the item |
| `onTurnStart_toggle` | Actor's turn begins | Toggles active state |
| `onTurnStart_on` | Actor's turn begins | Activates the item |
| `onTurnStart_off` | Actor's turn begins | Deactivates the item |
| `onTurnStart_delete` | Actor's turn begins | Deletes the item |
| `onTurnEnd_use` | Actor's turn ends | Uses the item |
| `onTurnEnd_toggle` | Actor's turn ends | Toggles active state |
| `onTurnEnd_on` | Actor's turn ends | Activates the item |
| `onTurnEnd_off` | Actor's turn ends | Deactivates the item |
| `onTurnEnd_delete` | Actor's turn ends | Deletes the item |
| `onRoundStart_use` | New round begins | Uses the item |
| `onRoundStart_toggle` | New round begins | Toggles active state |
| `onRoundStart_on` | New round begins | Activates the item |
| `onRoundStart_off` | New round begins | Deactivates the item |
| `onRoundStart_delete` | New round begins | Deletes the item |

### Setting Triggers via Script/Macro

You can also add boolean flags programmatically:

```js
// Delete a buff when combat ends
await item.addItemBooleanFlag("onCombatEnd_delete");

// Use the item at the start of the owner's turn
await item.addItemBooleanFlag("onTurnStart_use");

// Activate at combat start, deactivate at combat end
await item.addItemBooleanFlag("onCombatStart_on");
await item.addItemBooleanFlag("onCombatEnd_off");
```

### Removing Triggers

```js
await item.removeItemBooleanFlag("onCombatEnd_delete");
```

### Common Recipes

**Temporary buff that lasts one encounter:**
Add boolean flag `onCombatEnd_delete` — the buff will be automatically removed when the GM ends combat.

**Per-turn resource consumption:**
Add boolean flag `onTurnStart_use` — the item will be used at the start of each of the actor's turns.

**Combat-only buff:**
Add boolean flags `onCombatStart_on` and `onCombatEnd_off` — the buff activates when combat starts and deactivates when it ends.

## Compatibility

- **Minimum Foundry Version**: 13
- **Verified Version**: 13
- **Required System**: Pathfinder 1e
