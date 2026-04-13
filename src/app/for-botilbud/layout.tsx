import { marketingFontVariableClassName } from '../marketing-fonts';
import '../budr-landing.css';

export default function ForBotilbudLayout({ children }: { children: React.ReactNode }) {
  return <div className={marketingFontVariableClassName}>{children}</div>;
}
