# Khel Club - Frontend (v0) - Walkover Feature & UI Documentation

## Overview
This repository contains the Next.js frontend application for the **Khel Club Pickleball Tournament Management System**. It provides interfaces for tournament directors, referees, and spectators.

As part of the Match Outcome extension, full end-to-end support for **Walkover** matches has been introduced across all referee and tournament views without altering existing UI patterns or breaking standard score-based matches.

---

## 1. Walkover Feature Implementation

### Referee Workflows
1. **Match Scoring View (`src/screen/referee/match/Match.js`)**:
   - Added an **"Award Walkover"** action button in the referee controls.
   - Implemented an accessible Walkover Dialog allowing referees to:
     - Select which team wins the walkover (Team 1 or Team 2).
     - Enter an optional reason/audit note (e.g. *"Player injured during warmup"*, *"Opponent no-show"*).
   - Once awarded, a prominent **Walkover Banner** is displayed at the top of the screen indicating the winner and reason, while score inputs are locked at `0-0`.
   - Sends a request to `POST /match/outcome` to finalize the match.

2. **Referee Match Table (`src/components/refereeMatchTable/RefereeMatchTable.js`)**:
   - Result column displays a prominent **`W/O`** badge.
   - Status column displays a dedicated **`Walkover`** tag.
   - The winning team is styled in bold green with a **`(Winner)`** indicator.
   - Added an **"Award Walkover"** action button directly inside the table for rapid operations without opening the scoring screen.

### Public & Spectator Views
1. **Tournament Fixtures (`src/components/fixtures/TournamentFixtures.js` & `BaseFixtures.js`)**:
   - Match cards feature a visible orange **`Walkover`** badge next to the Match ID.
   - The winning team card is highlighted with a green border and **`(Winner)`** text.
   - The conceding team is rendered with muted, strike-through text.
   - Score badges display **`W`** and **`L`** instead of raw `0-0` numbers.
   - Match status displays **`Completed (Walkover)`**.

2. **Knockout Bracket (`src/components/fixtures/KnockoutBracket.js`)**:
   - For walkover matches, participant scores show **`W (W/O)`** and **`L`** to indicate default progression.
   - The winner automatically advances along the bracket tree.

3. **Pool Operations (`src/screen/organizer/matchops/poolops/[id]/components/PoolFixtures.js`)**:
   - Pool fixture cards show the **`Walkover`** badge in the header with winner highlighting.

4. **Match Table (`src/components/matchTable/MatchTable.js`)**:
   - Match rows display **`W/O`** and **`Walkover`** status.
   - CSV export accurately records `'W/O'` and `'walkover'`.

---

## 2. API Integration

Endpoints are centralized in [`src/store/urls.js`](src/store/urls.js):
```javascript
export const endpoints = {
    ...
    updateMatchScore: baseurl + "/update-score",
    matchOutcome: baseurl + "/match/outcome",
    ...
};
```

When awarding a walkover, the frontend sends a `POST` request to `endpoints.matchOutcome`:
```json
{
  "match_id": 8,
  "tournament_id": 1,
  "outcome_type": "walkover",
  "winner_team_id": "T001",
  "details": "Opponent conceded due to injury",
  "override": true
}
```

---

## 3. Hydration & Compatibility

- Added `suppressHydrationWarning` to `<html>` and `<body>` in [`src/app/layout.js`](src/app/layout.js) to safeguard against DOM modifications injected by browser extensions (e.g., Grammarly).
- Reused existing SCSS module classes and color variables (`#f57c00` for walkover badges, `#2e7d32` for winner highlights) to maintain UI consistency.

---

## 4. Local Development

### Prerequisites
- Node.js 18+ (tested with Node.js 20/22)
- Running backend on `http://localhost:5001`

### Setup & Run
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app:
- Referee matches: `http://localhost:3000/referee/1/matches`
- Tournament view: `http://localhost:3000/tournament/1`
