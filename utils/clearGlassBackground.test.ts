import {describe,expect,it} from 'vitest';
import {repairClearGlassBackground} from './clearGlassBackground';
import preset from '../presets/chat/clear-glass-bilingual.json';
describe('clear glass wallpaper compatibility',()=>{
 it('repairs already applied legacy CSS without touching the rest of the outfit',()=>{const old='.sully-chat-root { background:radial-gradient(ellipse at 18% 18%,#d7ded6 0,transparent 42%),linear-gradient(135deg,#99a69d,#536c63 58%,#bac7ba) !important; }';const css=old+'\n.my-custom {color:red}';const result=repairClearGlassBackground(css);expect(result).toContain('var(--sully-clear-glass-image,');expect(result).toContain('.my-custom {color:red}');expect(repairClearGlassBackground(result)).toBe(result);});
 it('leaves other themes intact and ships the fixed builtin',()=>{const css='.sully-chat-root {background:purple !important;}';expect(repairClearGlassBackground(css)).toBe(css);expect(preset.parts.css).toContain('var(--sully-clear-glass-image,');});
});
