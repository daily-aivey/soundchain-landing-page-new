# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

SoundChain Landing Page is a rebuilt Next.js 15 application featuring a Web3 music platform landing page. The project emphasizes **clean architecture** and **bulletproof implementation** to eliminate fragile coupling issues from the original version while maintaining pixel-perfect visual fidelity.

**Key Technologies:**
- Next.js 15.4.5 with App Router
- React 19.1.0 with TypeScript
- Tailwind CSS v4
- Multiple database adapters (Vercel KV, PostgreSQL, File-based)
- Canvas-based particle systems
- Custom sequential scroll reveal system

## Common Development Commands

### Development
```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Environment Setup
```bash
# Copy environment template
cp .env.local.example .env.local

# Edit with your actual values
# Required: RESEND_API_KEY for email functionality
# Optional: KV_* variables for Vercel KV database
# Optional: DATABASE_URL for PostgreSQL
```

### Testing Commands
```bash
# Run development server and test scroll animations
npm run dev
# Then manually test:
# - Slow scroll: Elements reveal in correct order (1→2→3→4→5→6)
# - Fast scroll: No elements skip or reorder
# - Scroll up/down: Sequence remains stable
# - Reload mid-page: Elements in view appear correctly

# Test responsive design
# - Mobile (375px): Check mobile-specific title reveal timing
# - Tablet (768px): Verify grid layouts adapt
# - Desktop (1200px+): Confirm optimal spacing
```

## Architecture Overview

### Core Systems

**1. Sequential Scroll Reveal System**
- **Location**: Embedded in `app/page.tsx` (lines 111-583)
- **Purpose**: Deterministic, fail-safe scroll-triggered animations
- **Key Features**:
  - Global state management with single IntersectionObserver
  - Sequential ordering prevents race conditions (elements must reveal in DOM order)
  - Device-specific thresholds (mobile: 10%, desktop: 30%)
  - Fail-safe mechanisms with timeout recovery
  - Special mobile title handling with scroll direction detection

**2. Multi-Adapter Database System**
- **Location**: `lib/database.js`
- **Purpose**: Flexible storage backend supporting multiple environments
- **Adapters**:
  - **VercelKVAdapter**: Primary for production (Vercel KV)
  - **PostgreSQLAdapter**: Traditional database support
  - **FileAdapter**: Local development (JSON file)
  - **EnvAdapter**: Minimal fallback
- **Auto-detection**: Chooses adapter based on environment variables

**3. Canvas-Based Particle Systems**
- **Location**: `app/page.tsx` (lines 685-958)
- **Components**:
  - **Background particles**: Simple floating ambiance (120 particles)
  - **Interactive particles**: Mouse-attracted with connections (70 particles)
  - **Extra particles**: Additional visual layer (100 particles)
- **Features**: Proper cleanup, DPR handling, performance limits

**4. Progress Bar Animation**
- **Location**: `app/page.tsx` (lines 585-669)
- **Purpose**: Smooth, controlled signup progress visualization
- **Features**: RAF-based animation, easing functions, prevent re-renders

### Database Operations

**Key Functions** (`lib/database.js`):
```javascript
// Get current signup count
await getSignupCount()

// Add new email signup (returns boolean)
await addSignup(email)

// Check if email exists (duplicate prevention)
await checkEmailExists(email)

// Get progress data with percentage
await getProgress()
```

**API Endpoints** (`app/api/send/route.js`):
- `GET /api/send`: Fetch current signup progress
- `POST /api/send`: Submit email signup with validation

### Component Architecture

**Page Structure**:
```
app/page.tsx (main component)
├── Background layers (gradient, 3x particle canvases)
├── Hero section (logo, title, description, CTA form)
├── Progress section (animated bar with visualizer)
├── Benefits section (3 feature cards)
└── Footer (social links)
```

**Key State Management**:
- `email`, `isSubmitting`: Form handling
- `progress`, `targetProgress`, `progressVisible`: Progress bar animation
- `count`, `goal`: Database-driven signup metrics
- `isMobile`: Device-specific behavior triggers

## Development Guidelines

### Making Changes to Scroll Reveals

**Adding New Reveal Steps**:
1. Add element with `data-reveal` attribute
2. Optional: Set `data-delay="ms"` for staggered timing
3. Place in DOM order for sequential reveals
4. Elements automatically join the global reveal queue

**Modifying Reveal Behavior**:
- **Mobile vs Desktop**: Different thresholds automatically applied
- **Special Cases**: Footer uses lenient observer, mobile title uses strict observer
- **Debug Mode**: Check browser console for detailed logging

### Database Integration

**Environment Variable Priority**:
1. `KV_URL` + `KV_REST_API_URL` → Vercel KV (production)
2. `DATABASE_URL` → PostgreSQL (traditional database)
3. Node.js file system → File adapter (development)
4. Fallback → Environment adapter (testing)

**Adding New Storage Adapters**:
1. Extend `StorageAdapter` class in `lib/database.js`
2. Implement: `getCount()`, `addEmail()`, `emailExists()`
3. Add detection logic to `createStorageAdapter()`

### Styling and Animations

**CSS Organization** (`styles/globals.css`):
- Animated gradient background
- Logo pulse animation with glow effects
- Hero text gradients and shadows
- Progress bar with audio visualizer styling
- Toast notification system
- Social icon hover effects

**Critical CSS Classes**:
- `.logo-always-visible`: Logo fade-in animation
- `.mobile-scroll-reveal`: Mobile-specific title behavior
- `.hero-gradient-text`: Gradient text styling
- `.signup-progress-fill`: Progress bar fill animation
- `.toast`: Notification system styling

### Email System Integration

**Resend Configuration**:
- Required: `RESEND_API_KEY` environment variable
- Email template embedded in `route.js` (lines 188-256)
- Graceful degradation if email service unavailable

**Email Flow**:
1. Validate email format client and server-side
2. Check for duplicates in database
3. Send welcome email via Resend
4. Store email in database
5. Return updated progress data
6. Show toast notification

## Common Issues and Solutions

### Scroll Reveal Issues
- **Problem**: Elements not revealing
  - **Check**: Console logs show intersection events
  - **Fix**: Verify `data-reveal` attributes and DOM order

- **Problem**: Mobile title revealing too early
  - **Check**: `scrollY > 50px` and scroll direction requirements
  - **Fix**: Adjust mobile observer thresholds

### Database Issues
- **Problem**: Signups not persisting
  - **Check**: Environment variables are set correctly
  - **Debug**: Console shows which adapter is being used
  - **Fix**: Verify database credentials and connections

### Performance Issues
- **Problem**: Animations are choppy
  - **Check**: Particle counts and RAF loops
  - **Fix**: Reduce particle counts or throttle updates

### Email Issues
- **Problem**: Emails not sending
  - **Check**: `RESEND_API_KEY` is valid
  - **Debug**: API response logs in console
  - **Fix**: Verify Resend domain configuration

## Production Deployment Notes

### Vercel Deployment
1. Set environment variables in Vercel dashboard
2. Create KV database if using Vercel KV storage
3. Domain configuration for Resend email service
4. Enable production logging for debugging

### Environment Variables Checklist
- `RESEND_API_KEY`: Email service (required)
- `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`: Vercel KV (recommended)
- `DATABASE_URL`: PostgreSQL alternative
- `SIGNUP_GOAL`: Custom signup target (defaults to 5000)

### Performance Considerations
- Particle systems auto-adjust for device capabilities
- Progress animations optimized with reduced re-render frequency
- Database queries cached appropriately
- Static assets properly optimized

## File Structure Reference

```
soundchain-landing-new/
├── app/
│   ├── api/send/route.js       # Email signup API endpoint
│   ├── layout.tsx              # Root layout with fonts/metadata
│   └── page.tsx                # Main component (all functionality)
├── lib/
│   ├── database.js             # Multi-adapter database system
│   └── toast.ts                # Toast notification system
├── public/                     # Static assets (logos, icons, images)
├── styles/
│   └── globals.css             # All application styles
├── package.json                # Dependencies and scripts
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
└── .env.local.example          # Environment variable template
```

This architecture prioritizes maintainability, performance, and reliability while preserving the exact visual experience of the original design.
