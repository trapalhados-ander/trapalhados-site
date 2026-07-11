---
name: Kinetic Chaos
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d6c4ac'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#9e8e79'
  outline-variant: '#514533'
  surface-tint: '#ffba3b'
  primary: '#ffca74'
  on-primary: '#432c00'
  primary-container: '#f2a900'
  on-primary-container: '#614200'
  inverse-primary: '#7f5700'
  secondary: '#ffb5a0'
  on-secondary: '#5f1500'
  secondary-container: '#d73b00'
  on-secondary-container: '#fffbff'
  tertiary: '#33e6ff'
  on-tertiary: '#00363d'
  tertiary-container: '#00c9e0'
  on-tertiary-container: '#00505a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdead'
  primary-fixed-dim: '#ffba3b'
  on-primary-fixed: '#281900'
  on-primary-fixed-variant: '#604100'
  secondary-fixed: '#ffdbd1'
  secondary-fixed-dim: '#ffb5a0'
  on-secondary-fixed: '#3b0900'
  on-secondary-fixed-variant: '#862200'
  tertiary-fixed: '#9cf0ff'
  tertiary-fixed-dim: '#00daf3'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004f58'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Bebas Neue
    fontSize: 72px
    fontWeight: '400'
    lineHeight: '1.0'
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Bebas Neue
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
  headline-lg-mobile:
    fontFamily: Bebas Neue
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.1'
  headline-md:
    fontFamily: Bebas Neue
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1440px
---

## Brand & Style
The design system is built for the high-octane, often hilarious world of competitive gaming. It bridges the gap between professional esports utility and the chaotic, comedic energy of battle-royale "fails." The visual language is defined by a "Tactical-Grunge" aesthetic—combining clean, futuristic glassmorphism with raw, battle-worn textures.

**Target Audience:**
Hardcore and casual gamers, streamers, and community members who value high-energy competition but don't take themselves too seriously.

**Emotional Response:**
- **Adrenaline:** High-contrast neon triggers immediate focus.
- **Ruggedness:** Grunge overlays and sharp angles evoke a "survivor" mentality.
- **Wit:** Bold, expressive typography adds a layer of comedic impact to game stats and social interactions.

## Colors
The palette is dominated by an "Immersive Dark" foundation to minimize eye strain during long gaming sessions while allowing neon accents to pop with maximum vibrance.

- **Deep Blacks & Charcoal:** Used for the core UI structure to create a sense of infinite depth.
- **PUBG Yellow (#F2A900):** The primary action color. Used for critical CTAs, rankings, and "Winner" states.
- **Tactical Orange (#FF5722):** The secondary accent. Used for alerts, heatmaps, and high-energy notifications.
- **Neon Cyan (Tertiary):** Introduced sparingly for technical data or "shield" metrics to provide a cooling contrast to the warm primary palette.

## Typography
Typography is split between aggressive display faces and technical, high-legibility sans-serifs.

- **Headlines:** `Bebas Neue` provides a tall, condensed, and impactful look reminiscent of military stencils and sports broadcasts. Use all-caps for headlines to maintain the "loud" brand voice.
- **Body:** `Geist` offers a clean, developer-centric feel that balances the chaos of the display font with professional clarity.
- **Technical Data:** `JetBrains Mono` is used for stats, coordinates, and system logs to reinforce the "HUD" (Heads-Up Display) aesthetic.

## Layout & Spacing
The layout follows a **Fluid Grid** model with high internal density to mimic a gaming dashboard.

- **Grid:** A 12-column system is used for desktop, collapsing to 4 columns on mobile.
- **Safe Zones:** High-intensity content is centered, while secondary HUD elements (navigation, profile, friends list) are anchored to the screen edges with 24px internal padding.
- **Spacing Rhythm:** Based on a 4px baseline. Use 8px for tight component grouping and 32px+ for section separation.

## Elevation & Depth
Depth is created through **Glassmorphism** and **Glow-mapping** rather than traditional drop shadows.

- **Surface Layers:** Surfaces use a background blur (12px to 20px) and a semi-transparent fill (`#1A1A1A` at 80% opacity).
- **Neon Outlines:** Instead of shadows, elevated elements use a 1px inner or outer border with a subtle neon glow (2px blur) in the primary primary color.
- **Grunge Overlays:** Low-opacity noise and "scratched metal" textures are applied to the base background to break up flat digital gradients and add tactile grit.

## Shapes
This design system embraces a **Sharp (0px)** aesthetic. 

Rounded corners are avoided to maintain a rugged, aggressive, and industrial feel. Sharp 45-degree chamfered corners may be used for buttons and container headers to evoke a futuristic, tactical appearance. This lack of roundedness differentiates the product from "soft" consumer apps and aligns with military-style UI.

## Components

### Buttons
- **Primary:** Sharp-edged, solid PUBG Yellow fill with black text. On hover, apply a heavy outer glow (`#F2A900` at 50% opacity).
- **Secondary:** Ghost style with a 2px Tactical Orange border. Text is all-caps `Bebas Neue`.
- **Destructive:** Solid Orange fill with a "pulsing" neon animation when active.

### Glassmorphic Cards
Cards feature a 1px border stroke (`rgba(255, 255, 255, 0.1)`) and a subtle texture overlay. The header of the card should be separated by a high-contrast yellow line.

### Inputs & Fields
Dark background (`#050505`) with a bottom-only border. When focused, the border turns Neon Cyan and a subtle "scanline" animation appears within the field.

### Chips & Tags
Used for player roles (e.g., "MVP", "SQUAD"). These should be styled as "Dog Tags"—rectangular with a small circular "cutout" on the side, using `JetBrains Mono` for the label.

### Progress Bars
Segmented bars (reminiscent of health bars) rather than smooth fills. Completed segments glow, while empty segments remain low-contrast charcoal.