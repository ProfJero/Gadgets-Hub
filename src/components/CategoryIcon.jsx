import { Laptop, BatteryCharging, Briefcase, Mouse, Monitor, HardDrive, Headphones, Wifi, Cable, Gamepad2, Smartphone, Package, Keyboard, Apple } from 'lucide-react';

const MAP = [
  [/mac|apple/, Apple],
  [/laptop|notebook/, Laptop],
  [/charg|power|battery|adapter/, BatteryCharging],
  [/bag|sleeve|case|backpack/, Briefcase],
  [/keyboard/, Keyboard],
  [/mouse|mice/, Mouse],
  [/monitor|display|screen/, Monitor],
  [/storage|ssd|drive|flash|memory|ram/, HardDrive],
  [/audio|headphone|speaker|earbud/, Headphones],
  [/network|router|wifi/, Wifi],
  [/cable|hub|dock|adapter/, Cable],
  [/gam/, Gamepad2],
  [/phone|tablet/, Smartphone],
];

export const iconFor = (slug = '') => MAP.find(([re]) => re.test(slug))?.[1] || Package;

export default function CategoryIcon({ slug, className = 'h-6 w-6' }) {
  const Icon = iconFor(slug);
  return <Icon className={className} />;
}
