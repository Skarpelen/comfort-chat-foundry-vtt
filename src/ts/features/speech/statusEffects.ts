export const DRUNK_STATUS_ID = "comfort-chat-drunk";
export const DRUNK_STATUS_ICON = "icons/svg/daze.svg";

export function registerComfortChatStatusEffects(): void {
  const statusEffects = (CONFIG as any).statusEffects as any[] | undefined;

  if (!statusEffects || statusEffects.some((effect) => effect.id === DRUNK_STATUS_ID)) {
    return;
  }

  statusEffects.push({
    id: DRUNK_STATUS_ID,
    name: "COMFORT-CHAT.effects.drunk.name",
    img: DRUNK_STATUS_ICON
  });
}
