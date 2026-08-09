# HMRAY Design System

## Brand Direction
**Domain**: Oman → Iran Shopping Operations OMS  
**Theme**: Professional, Trustworthy, Transparent, Fast.  
**Styling Rules**: 
- **Admin**: "Professional SaaS". Light, clean, data-dense. Uses deep navy/slate as primary to convey trust and operational stability. NO purple SaaS clichés, NO cream/terracotta AI looks.
- **Customer**: "Mobile-first Clean". Optimized for mobile speed and clarity, single-column focus, large typography. Telegram-inspired minimal commerce flow.

## Color Palette (CSS Variables)

### Admin (Light Professional)
- **Primary**: Deep Slate/Navy (`#0f172a` / `222 47% 11%`) - Trustworthy, serious.
- **Background**: Very light slate (`#f8fafc` / `210 40% 98%`)
- **Card**: Pure White (`#ffffff`)
- **Border**: Light slate (`#e2e8f0` / `214 31.8% 91.4%`)
- **Muted Text**: Slate 500 (`#64748b`)

### Customer (Mobile Clean)
- **Primary Action**: Bright Commerce Blue or Orange CTA on minimal white/black backgrounds.
- **Background**: `#ffffff` or `#f8fafc`

## Status Badges
Status colors are crucial for order/quote tracking:
- **Draft / Cancelled**: Slate (`bg-slate-100 text-slate-700`)
- **Pending (Request/Quote)**: Amber/Orange (`bg-amber-100 text-amber-800`)
- **Awaiting Payment / Processing**: Blue (`bg-blue-100 text-blue-700`)
- **Paid / Completed**: Green (`bg-green-100 text-green-700`)
- **Shipped**: Indigo (`bg-indigo-100 text-indigo-700`)

## Typography
- **Primary Font**: `Vazirmatn` (Google Font)
- **Fallback**: System sans-serif
- **Why**: Excellent legibility for Persian (RTL) text, clean Latin characters, professional geometric sans look. Expressive enough without being overly stylized.

## Layout Patterns

### Admin Layouts
- **3-Column Request Workspace**: 
  - Left/Right (depending on RTL): List of requests/orders.
  - Center: Details & form.
  - Other Side: Context (customer history, timeline).
- **Composer**: Fixed-bottom or inline card composer for adding quotes, notes, or sending messages to customers.
- **Timeline**: Vertical chronological history of an order (Request -> Quote -> Payment -> Shipping).
- **Tables**: Dense, border-bottom only, high contrast headers, hover states on rows.

### Customer Layouts (Mobile)
- **/q (Quote) and /o (Order)**:
  - **Rhythm**: Product Name (Large) → Image (if any) → Price breakdown → Context/Note → Sticky bottom CTA (Approve / Pay).
  - Clean card separation, minimal distractions.

## Spacing, Radius, Shadows
- **Spacing**: Tailwind standard (4px base). 
- **Radius**: `0.5rem` (8px) for cards and buttons. Modern but not overly pill-shaped.
- **Shadows**: 
  - Cards: Very subtle `shadow-sm` (`0 1px 2px 0 rgb(0 0 0 / 0.05)`).
  - Dropdowns/Modals: `shadow-md` or `shadow-lg`.
  - Avoid heavy, muddy shadows.

## Accessibility & Interaction
- **Touch**: 44px minimum touch targets on mobile (Customer app).
- **Focus Rings**: `ring-2 ring-slate-900 ring-offset-2` on all interactive elements.
- **Contrast**: Text contrast ratios > 4.5:1 (e.g., avoid `slate-400` on white, use `slate-600` min).
- **Interactive**: `cursor-pointer` on all clickable cards, buttons. Active states (`active:scale-[0.98]`).

## Anti-patterns to Avoid
- **DO NOT** use emojis as icons (use Lucide/Heroicons).
- **DO NOT** use default `alert()` or raw HTML forms without styling.
- **DO NOT** use purple/pink glowing gradients.
- **DO NOT** hide scrollbars on tables if it breaks accessibility.
- **DO NOT** use layout shifts on hover.
