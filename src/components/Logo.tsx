import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'full' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { icon: 24, text: 'text-base' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 44, text: 'text-2xl' },
}

/** MoneyMap logo — map pin + ₹ symbol icon, optionally with text */
export function Logo({ variant = 'full', size = 'md', className }: LogoProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size]

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      {/* Icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Map-pin body */}
        <path
          d="M24 4C16.268 4 10 10.268 10 18C10 27.5 24 44 24 44C24 44 38 27.5 38 18C38 10.268 31.732 4 24 4Z"
          className="fill-brand-500 dark:fill-brand-400"
        />
        {/* Inner circle for depth */}
        <circle cx="24" cy="18" r="9" className="fill-brand-600 dark:fill-brand-600" opacity="0.4" />
        {/* ₹ symbol */}
        <text
          x="24"
          y="23"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Manrope, system-ui, sans-serif"
          fontSize="13"
          fontWeight="800"
          fill="white"
        >
          ₹
        </text>
      </svg>

      {/* Text (only in 'full' variant) */}
      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              'font-bold tracking-tight text-[var(--text-primary)]',
              textSize
            )}
          >
            Money<span className="text-brand-500 dark:text-brand-400">Map</span>
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] font-medium text-[var(--text-muted)] tracking-wide uppercase mt-0.5">
              Your money, clearly mapped
            </span>
          )}
        </div>
      )}
    </div>
  )
}
