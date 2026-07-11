# GET IN THE KITCHEN

Budget-first meal planning for women managing a household.
Real meals. Real budget. Real life.

## Tech stack
- React 18
- localStorage for data persistence (no backend needed for MVP)
- Anthropic Claude API for AI features
- Hosted on Vercel (free tier)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Run locally
```bash
npm start
```
Opens at http://localhost:3000

### 3. Deploy to Vercel
See DEPLOY.md for step-by-step hosting instructions.

## Project structure
```
src/
  components/    # Shared UI components (buttons, sheets, banners)
  screens/       # One file per screen
  hooks/         # useStore — all app state and localStorage
  data/          # Seed meals, constants
  index.css      # Design system / global styles
```

## Adding your API key
Go to Settings tab → paste your Anthropic API key (get one free at console.anthropic.com)
