import * as SliderPrimitive from '@radix-ui/react-slider'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type SliderProps = ComponentProps<typeof SliderPrimitive.Root> & {
  thumbAriaLabel?: string
}

function Slider({ className, thumbAriaLabel, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/12">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-amber-300 to-orange-400" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block size-4 rounded-full border border-amber-100/80 bg-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        aria-label={thumbAriaLabel}
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }
