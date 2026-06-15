import {
  User, DoorOpen, CircleDot, Car, Wrench,
  Mic2, Box, Dumbbell, Scissors, Monitor,
  Anchor, Camera, type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  'user':       User,
  'door-open':  DoorOpen,
  'circle-dot': CircleDot,
  'car':        Car,
  'wrench':     Wrench,
  'mic-2':      Mic2,
  'box':        Box,
  'dumbbell':   Dumbbell,
  'scissors':   Scissors,
  'monitor':    Monitor,
  'anchor':     Anchor,
  'camera':     Camera,
}

interface ResourceTypeIconProps {
  icon: string
  size?: number
  color?: string
  className?: string
}

export function ResourceTypeIcon({ icon, size = 18, color, className }: ResourceTypeIconProps) {
  const Icon = ICON_MAP[icon] ?? Box
  return <Icon width={size} height={size} color={color} className={className} strokeWidth={2} />
}
