# Sebastian UI Layout System

## Overview

This document describes the extensible UI layout system implemented for the Sebastian Electron application. The system is built with CSS Grid, custom properties (CSS variables), and a modular architecture designed for future expansion.

## Architecture

### File Structure

```
src/renderer/styles/
├── main.css              # Main entry point - imports all other styles
├── variables.css          # CSS custom properties (design tokens)
├── base.css              # CSS reset and base element styles
├── utilities.css          # Utility classes
├── components/
│   ├── layout.css        # General layout components
│   ├── grid.css          # Advanced CSS Grid layouts
│   └── button.css        # Button component styles
└── README.md             # This documentation
```

### Import Order

1. **Variables** - CSS custom properties for design tokens
2. **Base** - Reset and base element styles
3. **Layout Components** - Grid systems and layout utilities
4. **UI Components** - Individual component styles
5. **Utilities** - Helper classes

## CSS Custom Properties (Design Tokens)

### Colors

```css
/* Light Theme */
--color-primary: #28a745
--color-text-primary: #333333
--color-bg-primary: #ffffff

/* Dark Theme (applied via [data-theme="dark"]) */
--color-primary: #34d058
--color-text-primary: #ffffff
--color-bg-primary: #1a1a1a
```

### Spacing System

```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
--spacing-2xl: 48px
```

### Typography Scale

```css
--font-size-xs: 11px
--font-size-sm: 12px
--font-size-base: 14px
--font-size-lg: 16px
--font-size-xl: 18px
--font-size-2xl: 24px
```

## Grid System

### Application Layout

The main application uses a CSS Grid layout with named areas:

```css
.app-container {
  grid-template-areas: 
    "main"
    "footer";
  grid-template-rows: 1fr auto;
}
```

### Extended Layouts (Future Use)

```css
.app-grid--extended {
  grid-template-areas: 
    "header header header"
    "sidebar main aside"
    "footer footer footer";
}
```

### Grid Utilities

- `.grid-span-1` through `.grid-span-4` - Column spanning
- `.grid-row-span-1` through `.grid-row-span-4` - Row spanning
- `.gap-xs` through `.gap-xl` - Grid gap spacing

## Component System

### Button System

```css
/* Base button class */
.btn {
  /* Base styles */
}

/* Size variants */
.btn--sm, .btn--md, .btn--lg

/* Style variants */
.btn--primary, .btn--secondary, .btn--outline, .btn--ghost

/* State modifiers */
.btn--loading, .btn:disabled
```

### Layout Components

```css
/* Card layout */
.card, .card-header, .card-body, .card-footer

/* Panel layout */
.panel, .panel-header, .panel-body, .panel-footer

/* Flexbox utilities */
.flex, .flex-col, .items-center, .justify-between
```

## Utility Classes

### Spacing

```css
/* Margin */
.m-xs, .m-sm, .m-md, .m-lg, .m-xl
.mt-*, .mr-*, .mb-*, .ml-*

/* Padding */
.p-xs, .p-sm, .p-md, .p-lg, .p-xl
.pt-*, .pr-*, .pb-*, .pl-*
```

### Typography

```css
.text-xs, .text-sm, .text-base, .text-lg, .text-xl, .text-2xl
.font-normal, .font-medium, .font-semibold, .font-bold
.text-left, .text-center, .text-right
```

### Colors

```css
.text-primary, .text-secondary, .text-muted
.bg-primary, .bg-secondary, .bg-tertiary
```

## Theme System

### Theme Switching

Themes are applied via a data attribute on the root element:

```html
<!-- Light theme (default) -->
<html>

<!-- Dark theme -->
<html data-theme="dark">
```

### Adding New Themes

1. Define theme-specific custom properties in `variables.css`
2. Use the `:root[data-theme="theme-name"]` selector
3. Override existing color variables

```css
:root[data-theme="high-contrast"] {
  --color-primary: #000000;
  --color-bg-primary: #ffffff;
  /* ... other overrides */
}
```

## Responsive Design

### Breakpoints

```css
--breakpoint-sm: 480px
--breakpoint-md: 640px  /* Current window width */
--breakpoint-lg: 1024px
--breakpoint-xl: 1280px
```

### Mobile-First Approach

```css
/* Mobile first (default) */
.element { /* mobile styles */ }

/* Tablet and up */
@media (min-width: 640px) {
  .element { /* tablet styles */ }
}
```

## Accessibility

### Focus Management

- All interactive elements have visible focus states
- Focus rings use `--color-primary-focus`
- Respects `prefers-reduced-motion`

### Screen Reader Support

```css
.sr-only    /* Screen reader only text */
.not-sr-only /* Make sr-only visible again */
```

### High Contrast Support

```css
@media (prefers-contrast: high) {
  /* Enhanced contrast styles */
}
```

## Future Extensions

### Glass Effect System

Prepared utilities for future glass/frosted effects:

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
}
```

### Animation System

```css
.animate-fade-in
.animate-slide-up
.animate-scale-in
```

### Component Templates

Ready-to-use component patterns:

```css
.hero-grid     /* Hero section layout */
.nested-grid   /* Nested grid layouts */
.split-layout  /* Split pane layouts */
```

## Adding New Components

### 1. Component File Structure

Create a new file in `components/` directory:

```
src/renderer/styles/components/my-component.css
```

### 2. Follow BEM Naming Convention

```css
/* Block */
.my-component { }

/* Element */
.my-component__element { }

/* Modifier */
.my-component--variant { }
.my-component--state { }
```

### 3. Use Design Tokens

Always use custom properties instead of hardcoded values:

```css
.my-component {
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
}
```

### 4. Import in main.css

Add the import in the appropriate section:

```css
/* 4. UI Components */
@import './components/button.css';
@import './components/my-component.css';
```

## Performance Guidelines

### CSS Organization

1. Keep specificity low
2. Use classes over IDs
3. Avoid deep nesting (max 3 levels)
4. Prefer composition over inheritance

### Custom Properties Usage

```css
/* Good - semantic naming */
--button-primary-bg: var(--color-primary);

/* Avoid - implementation details */
--green-500: #28a745;
```

### Media Queries

1. Use consistent breakpoints
2. Group related media queries
3. Consider mobile-first approach

## Browser Support

### Target Browsers

- Chrome 90+ (Electron 13+)
- Modern CSS features are supported

### Fallbacks

```css
/* Feature detection */
@supports (grid-template-rows: subgrid) {
  .subgrid-rows {
    grid-template-rows: subgrid;
  }
}
```

## Testing Guidelines

### Layout Testing

1. Test at 640x480 resolution (current window size)
2. Verify component positioning in grid areas
3. Test with different content sizes
4. Validate theme switching
5. Test focus navigation

### CSS Validation

1. Use CSS linting rules
2. Validate custom property usage
3. Check for unused styles
4. Verify accessibility compliance

## Maintenance

### Regular Tasks

1. Review and update design tokens
2. Remove unused styles
3. Optimize performance
4. Update documentation

### Version Updates

When updating the layout system:

1. Update this README
2. Test existing components
3. Provide migration guide if needed
4. Document breaking changes

---

## Quick Reference

### Common Patterns

```css
/* Centered content */
.place-items-center

/* Card with shadow */
.card.shadow-md

/* Button with spacing */
.btn.btn--primary.m-md

/* Responsive grid */
.content-grid.content-grid--auto

/* Flex layout */
.flex.items-center.justify-between
```

### Design Token Usage

Always use custom properties for:
- Colors
- Spacing
- Typography
- Shadows
- Border radius
- Transitions

### File Naming

- Use kebab-case for file names
- Component files go in `components/`
- Utility files go in the root styles directory
- Follow the established import order