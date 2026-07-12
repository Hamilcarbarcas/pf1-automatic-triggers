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
const DEBUG = false; // Set to false to silence diagnostic logs

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

function log(...args) {
  if (DEBUG) console.error(`${MODULE_ID} |`, ...args);
}

function warn(...args) {
  console.error(`${MODULE_ID} |`, ...args);
}

Hooks.once("ready", () => {
  if (!game.user.isGM) {
    log("Not GM — skipping hook registration.");
    return;
  }

  /* ---- Helpers ---- */

  /**
   * Execute a trigger action on a single item.
   * @param {Item}   item
   * @param {string} action
   */
  async function executeTrigger(item, action) {
    log(`  Executing "${action}" on "${item.name}" (${item.id}) for actor "${item.actor?.name}"`);
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
    log(`Processing "${triggerKey}" for ${actors.length} actor(s):`, actors.map(a => a?.name));
    for (const actor of actors) {
      if (!actor) continue;
      const toDelete = [];

      for (const item of actor.items) {
        const bFlags = item.system.flags?.boolean;
        if (!bFlags) continue;

        for (const action of ACTIONS) {
          const flagName = `${triggerKey}_${action}`;
          if (bFlags[flagName] !== true) continue;

          log(`  Found flag "${flagName}" on item "${item.name}" (${item.id})`);
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
        log(`  Batch deleting ${toDelete.length} item(s) from "${actor.name}":`, toDelete);
        await actor.deleteEmbeddedDocuments("Item", toDelete);
      }
    }
  }

  /** Safely run processTriggers, catching and logging any errors. */
  function safeTrigger(actors, triggerKey) {
    // Only the primary (active) GM processes triggers. Every GM client
    // registers these hooks, but game.users.activeGM resolves to a single
    // GM, so this avoids duplicate execution when >1 GM is connected.
    if (!game.users.activeGM?.isSelf) {
      log(`Not the active GM — skipping "${triggerKey}".`);
      return;
    }
    processTriggers(actors, triggerKey).catch(err => {
      warn(`Error processing "${triggerKey}":`, err);
    });
  }

  /** Get all unique actors from a combat's combatants. */
  function getCombatActors(combat) {
    return [...new Set(
      combat.combatants.map(c => c.actor).filter(Boolean)
    )];
  }

  /* ---- Combat Start ---- */
  Hooks.on("combatStart", (combat) => {
    log("Hook: combatStart");
    const actors = getCombatActors(combat);
    safeTrigger(actors, "onCombatStart");
  });

  /* ----
   * Combat End
   *
   * Cache actors in preDeleteCombat (before data is torn down),
   * then process onCombatEnd in deleteCombat.
   * ---- */
  const _pendingEndActors = new Map();

  Hooks.on("preDeleteCombat", (combat) => {
    if (!combat.started) return;
    const actors = getCombatActors(combat);
    log("Hook: preDeleteCombat — caching", actors.length, "actor(s) for onCombatEnd");
    _pendingEndActors.set(combat.id, actors);
  });

  Hooks.on("deleteCombat", (combat) => {
    log("Hook: deleteCombat — started:", combat.started);
    const actors = _pendingEndActors.get(combat.id);
    _pendingEndActors.delete(combat.id);
    if (!actors?.length) {
      // Fallback: try reading directly (may still work)
      const fallback = getCombatActors(combat);
      if (fallback.length) {
        log("  Using fallback actor list from deleteCombat");
        safeTrigger(fallback, "onCombatEnd");
      } else {
        log("  No actors found — skipping onCombatEnd");
      }
      return;
    }
    safeTrigger(actors, "onCombatEnd");
  });

  /* ---- Turn Start / Turn End ---- */
  Hooks.on("combatTurnChange", (combat, prior, current) => {
    log("Hook: combatTurnChange — prior:", prior, "current:", current);

    // Turn end: process for the actor whose turn just ended
    if (prior?.combatantId) {
      const prevActor = combat.combatants.get(prior.combatantId)?.actor;
      if (prevActor) {
        log(`  onTurnEnd for "${prevActor.name}"`);
        safeTrigger([prevActor], "onTurnEnd");
      }
    }

    // Turn start: process for the actor whose turn is starting
    if (current?.combatantId) {
      const curActor = combat.combatants.get(current.combatantId)?.actor;
      if (curActor) {
        log(`  onTurnStart for "${curActor.name}"`);
        safeTrigger([curActor], "onTurnStart");
      }
    }
  });

  /* ---- Round Start ---- */
  Hooks.on("combatRound", (combat, updateData, updateOptions) => {
    log("Hook: combatRound — round:", updateData?.round, "direction:", updateOptions?.direction);
    // Only fire on forward advancement; ignore round rewinds so triggers
    // don't re-fire when the GM steps combat backward.
    if (updateOptions?.direction < 0) return;
    const actors = getCombatActors(combat);
    safeTrigger(actors, "onRoundStart");
  });

  console.log(`${MODULE_ID} | Automatic trigger hooks registered (debug=${DEBUG})`);
});
