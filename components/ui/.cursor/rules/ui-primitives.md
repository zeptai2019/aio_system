# UI Primitives Rules

When working with UI primitives in components-new/ui:

## Structure
- Core fire-inspired components are in the root of `/components/ui`
- Magic UI components for special effects in `/components/ui/magicui`
- All components use the orange/fire theme from marketing

## Core Components (fire-inspired)
Primary UI primitives with fire theme:
- `button.tsx` - Button with orange glow effects
- `input.tsx` - Input with orange focus states  
- `badge.tsx` - Status badges with fire colors
- `modal.tsx` - Modal with backdrop blur and animations
- `checkbox.tsx`, `textarea.tsx` - Form components

## Animation & Display Components
- `animated-height.tsx`, `animated-width.tsx` - Smooth transitions
- `code.tsx` - Syntax highlighting (with code.css)
- `tooltip.tsx` - Hover tooltips
- `scrollbar.tsx` - Custom scrollbar
- `spinner.tsx` - Loading animations

## Usage Pattern
```tsx
// Fire-inspired components (default)
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
```

## Important Notes
1. **Fire-inspired by default** - All components use the orange/fire theme from marketing
2. **Component structure** - All components are single .tsx files (lowercase)
3. **CSS imports** - Component styles are imported globally via styles/components/