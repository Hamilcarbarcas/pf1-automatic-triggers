/* ============================================================
 * PF1e Automatic Triggers — Combat Lifecycle Automation
 *
 * Reads PF1 system boolean flags on items to automatically
 * perform actions when specific combat events occur.
 *
 * Boolean flags are set on the item sheet's Advanced tab.
 * Flag naming convention:  {trigger}_{action}
 *
 *   Triggers: onCombatStart, onCombatEnd, onTurnStart,
 *             onTurnEnd, onRoundStart
 *   Actions:  use, toggle, on, off, delete
 *
 * Examples:
 *   onCombatEnd_delete   — delete the item when combat ends
 *   onTurnStart_use      — use the item at the start of the
 *                           owner's turn
 *   onCombatStart_on     — activate the item when combat starts
 * ============================================================ */

const MODULE_ID = "pf1-automatic-triggers";

/** Valid actions and what they do. */
const ACTIONS = ["use", "toggle", "on", "off", "delete"];

/** Trigger keys mapped to readable labels (for logging). */
const TRIGGERS = [
  "onCombatStart",
  "onCombatEnd",
  "onTurnStart",
  "onTurnEnd",
  "onRoundStart",
];

Hooks.once("ready", () => {
  if (!game.user.isGM) return;   // only the GM processes triggers

  /* ---- Helpers ---- */

  /**
   * Execute a trigger action on a single item.
   * @param {Item}   item
   * @param {string} action
   */
  async function executeTrigger(item, action) {
    switch (action) {
      case "delete":
        await item.actor.deleteEmbeddedDocuments("Item", [item.id]);
        break;
      case "toggle":
        await item.update({ "system.active": !item.system.active });
        break;
      case "on":
        if (!item.system.active) await item.update({ "system.active": true });
        break;
      case "off":
        if (item.system.active) await item.update({ "system.active": false });
        break;
      case "use":
        await item.use();
        break;
    }
  }

  /**
   * Process all items for a given trigger key across a set of actors.
   * Batches deletes per-actor for efficiency.
   * @param {Actor[]} actors
   * @param {string}  triggerKey - e.g. "onCombatEnd"
   */
  async function processTriggers(actors, triggerKey) {
    for (const actor of actors) {
      if (!actor) continue;
      const toDelete = [];

      for (const item of actor.items) {
        const bFlags = item.system.flags?.boolean;
        if (!bFlags) continue;

        for (const action of ACTIONS) {
          const flagName = `${triggerKey}_${action}`;
          if (bFlags[flagName] !== true) continue;

          if (action === "delete") {
            toDelete.push(item.id);
          } else {
            await executeTrigger(item, action);
          }
          break;   // one action per trigger per item
        }
      }

      // Batch deletes
      if (toDelete.length) {
        await actor.deleteEmbeddedDocuments("Item", toDelete);
      }
    }
  }

  /** Get all unique actors from a combat's combatants. */
  function getCombatActors(combat) {
    return [...new Set(
      combat.combatants.map(c => c.actor).filter(Boolean)
    )];
  }

  /* ---- Combat Start ---- */
  Hooks.on("combatStart", (combat) => {
    const actors = getCombatActors(combat);
    processTriggers(actors, "onCombatStart");
  });

  /* ---- Combat End ---- */
  Hooks.on("deleteCombat", (combat) => {
    if (!combat.started) return;   // ignore tracker-only deletions
    const actors = getCombatActors(combat);
    processTriggers(actors, "onCombatEnd");
  });

  /* ---- Turn Start / Turn End ---- */
  Hooks.on("combatTurnChange", (combat, prior, current) => {
    // Turn end: process for the actor whose turn just ended
    if (prior?.combatantId) {
      const prevActor = combat.combatants.get(prior.combatantId)?.actor;
      if (prevActor) processTriggers([prevActor], "onTurnEnd");
    }

    // Turn start: process for the actor whose turn is starting
    if (current?.combatantId) {
      const curActor = combat.combatants.get(current.combatantId)?.actor;
      if (curActor) processTriggers([curActor], "onTurnStart");
    }
  });

  /* ---- Round Start ---- */
  Hooks.on("combatRound", (combat) => {
    const actors = getCombatActors(combat);
    processTriggers(actors, "onRoundStart");
  });

  console.log(`${MODULE_ID} | Automatic trigger hooks registered`);
});
