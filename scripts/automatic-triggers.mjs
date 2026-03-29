/* ============================================================
 * PF1e Automatic Triggers — Combat Lifecycle Automation
 *
 * Reads flags on items to automatically perform actions when
 * specific combat events occur.
 *
 * Flag format:
 *   item.flags["pf1-automatic-triggers"].triggers = {
 *     onCombatStart: "delete" | "toggle" | "on" | "off" | "use",
 *     onCombatEnd:   "delete" | "toggle" | "on" | "off" | "use",
 *     onTurnStart:   "delete" | "toggle" | "on" | "off" | "use",
 *     onTurnEnd:     "delete" | "toggle" | "on" | "off" | "use",
 *     onRoundStart:  "delete" | "toggle" | "on" | "off" | "use",
 *   }
 *
 * Setting a flag (from a script or macro):
 *   await item.setFlag("pf1-automatic-triggers", "triggers", { onCombatEnd: "delete" });
 *
 * Multiple triggers on the same item are supported:
 *   await item.setFlag("pf1-automatic-triggers", "triggers", {
 *     onTurnStart: "use",
 *     onCombatEnd: "delete",
 *   });
 * ============================================================ */

const MODULE_ID = "pf1-automatic-triggers";

Hooks.once("ready", () => {
  if (!game.user.isGM) return;   // only the GM processes triggers

  /* ---- Helpers ---- */

  /**
   * Execute a trigger action on a single item.
   * @param {Actor} actor
   * @param {Item}  item
   * @param {string} action - "delete" | "toggle" | "on" | "off" | "use"
   */
  async function executeTrigger(actor, item, action) {
    switch (action) {
      case "delete":
        await actor.deleteEmbeddedDocuments("Item", [item.id]);
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
   * Process all items with a given trigger key for a set of actors.
   * Batches deletes per-actor for efficiency.
   * @param {Actor[]} actors
   * @param {string}  triggerKey - e.g. "onCombatEnd"
   */
  async function processTriggers(actors, triggerKey) {
    for (const actor of actors) {
      if (!actor) continue;
      const toDelete = [];
      for (const item of actor.items) {
        const triggers = item.getFlag(MODULE_ID, "triggers");
        const action = triggers?.[triggerKey];
        if (!action) continue;

        if (action === "delete") {
          toDelete.push(item.id);
        } else {
          await executeTrigger(actor, item, action);
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
