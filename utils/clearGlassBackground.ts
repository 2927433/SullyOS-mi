/** Repair only the exact original bundled rule; never rewrite unrelated author CSS. */
const ORIGINAL_RULE=".sully-chat-root { background:radial-gradient(ellipse at 18% 18%,#d7ded6 0,transparent 42%),linear-gradient(135deg,#99a69d,#536c63 58%,#bac7ba) !important; }";
export const CLEAR_GLASS_BACKGROUND_RULE=".sully-chat-root { background-color:#536c63 !important; background-image:var(--sully-clear-glass-image, radial-gradient(ellipse at 18% 18%,#d7ded6 0,transparent 42%),linear-gradient(135deg,#99a69d,#536c63 58%,#bac7ba)) !important; background-size:cover !important; background-position:center !important; }";
export function repairClearGlassBackground(css:string):string{return css.replaceAll(ORIGINAL_RULE,CLEAR_GLASS_BACKGROUND_RULE);}
