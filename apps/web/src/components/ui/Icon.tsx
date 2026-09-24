import { cn } from '../../lib/cn';
import { ICONS, type IconName } from './icons';

const SIZES = { md: 'size-[18px]', sm: 'size-[15px]', xs: 'size-[13px]' };

export interface IconProps {
  name: IconName;
  size?: keyof typeof SIZES;
  /** Rotate -90°, the "collapsed" chevron. */
  rotated?: boolean;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 'md', rotated, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg
      className={cn('flex-none', SIZES[size], rotated && '-rotate-90', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
