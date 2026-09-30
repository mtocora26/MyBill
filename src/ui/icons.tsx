import {
  Baby, Banknote, Bike, BookOpen, Briefcase, Building2, Bus, Car, Clapperboard, Coffee, Coins, CreditCard,
  Dumbbell, Fuel, Gamepad2, Gift, GraduationCap, HandCoins, HeartPulse, House, Landmark, Laptop, Lightbulb,
  Music, Package, PawPrint, PiggyBank, Pill, Plane, Receipt, Scissors, Shirt, ShoppingCart, Smartphone,
  Stethoscope, Store, Tag, Train, TrendingUp, Tv, Users, Utensils, Wallet, Wifi, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react'

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  'shopping-cart': ShoppingCart,
  bus: Bus,
  car: Car,
  fuel: Fuel,
  train: Train,
  bike: Bike,
  plane: Plane,
  home: House,
  building: Building2,
  lightbulb: Lightbulb,
  zap: Zap,
  wifi: Wifi,
  smartphone: Smartphone,
  tv: Tv,
  'heart-pulse': HeartPulse,
  stethoscope: Stethoscope,
  pill: Pill,
  dumbbell: Dumbbell,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  clapperboard: Clapperboard,
  music: Music,
  gamepad: Gamepad2,
  shirt: Shirt,
  scissors: Scissors,
  'credit-card': CreditCard,
  landmark: Landmark,
  receipt: Receipt,
  wrench: Wrench,
  'paw-print': PawPrint,
  baby: Baby,
  users: Users,
  package: Package,
  tag: Tag,
  briefcase: Briefcase,
  laptop: Laptop,
  store: Store,
  gift: Gift,
  'piggy-bank': PiggyBank,
  banknote: Banknote,
  coins: Coins,
  'hand-coins': HandCoins,
  wallet: Wallet,
  'trending-up': TrendingUp,
}

export const ICON_KEYS = Object.keys(CATEGORY_ICONS)

export function CategoryIcon({ icon, className = 'size-5' }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] ?? Tag
  return <Icon className={className} aria-hidden="true" strokeWidth={1.9} />
}
