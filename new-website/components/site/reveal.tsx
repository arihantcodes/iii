'use client'

import { motion } from 'motion/react'

import { duration, easeOut } from '@/lib/motion'
import { cn } from '@/lib/utils'

type RevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li' | 'section' | 'header'
}

/** Fades content up once, the first time it enters the viewport. Tall blocks reveal as soon as their top 12% is in. */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const Component = motion[as]
  return (
    <Component
      className={cn('reveal', className)}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -40px 0px' }}
      transition={{ duration: duration.reveal, delay, ease: easeOut }}
    >
      {children}
    </Component>
  )
}
