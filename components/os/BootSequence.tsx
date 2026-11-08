import type { OSTheme } from '../../types';
import ClassicBootSequence from './ClassicBootSequence';

interface Props {
  dataReady: boolean;
  wallpaper?: string;
  style?: OSTheme['bootAnimationStyle'];
  onDone: () => void;
}
export default function BootSequence({ ...props }: Props) {
  // 糯米机使用无图片的经典开场，避免把另一个项目的开屏资源带入这里。
  return <ClassicBootSequence {...props} />;
}
