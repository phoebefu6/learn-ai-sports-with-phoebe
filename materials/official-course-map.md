# learn-ai-sports-with-phoebe - source map and coverage

Built 2026-08-26. Two tracks: director (a1-a6, 6 x 45 min) and analyst (b1-b10, 10 x 45 min).
Palette: pitch green `#15803D` + electric violet `#7C3AED`. Simulator: `assets/sports-live.js`.

Medical, welfare and data-protection content is orientation, not medical or legal advice.
Say so on every page that touches injury risk or athlete data.

---

## Verified facts (use these, do not invent numbers)

### Shot quality and match modelling

| Fact | Source | Where it is taught |
|---|---|---|
| Modern commercial xG models are trained on close to **one million historical shots** and integrate **20+ variables** including distance from goal, angle, defensive pressure and goalkeeper location | Stats Perform, on xG methodology | b1, b3 |
| In a peer-reviewed Bundesliga study comparing expected possession value with xG, **post-match xG predicted match outcome with accuracy about 0.656** | Bundesliga EPV vs xG study (PMC) | b1, b3, a1 |
| **Player and position corrections done properly help.** Bayesian hierarchical approaches (Bayes-xG) that pool player effects predict season goals for individual players and teams better than an overall xG model | Bayes-xG, arXiv 2311.13707 | b3 - the honest nuance beside the anti-lever |
| Tracking data enables richer models than event data alone; many production models still rely on event-extracted features | Tracking-data simulation research, arXiv 2503.19809 | b2, b3 |
| xG is now widely used in **recruitment and scouting** to find players whose underlying performance is not reflected in outcomes | Stats Perform; scouting literature | b7, a3 |

### Injury risk - the honest picture

| Fact | Source | Where it is taught |
|---|---|---|
| Injury-prediction model performance ranges from **poor (accuracy 52%, AUC 0.52) to strong (AUC 0.87, f1 85%)** and is **inconsistent across studies**, with many landing at AUC 0.63-0.65, which the literature itself calls poor | Systematic review of ML injury-risk models in football, 2026 | b5, a4 |
| **Low injury incidence limits model performance**; imbalanced datasets bias predictions toward non-injured players; generalisability suffers across environment, team context and assessment methods | Same systematic review; scoping review with evidence synthesis | b5, a4 |
| **Prior injury is the strongest single predictor** of future muscle injury, with hazard and odds ratios often above 2.0 | Systematic review evidence | b5 |
| GPS-derived workload variables capture short-term exposure but are **context dependent**, and relatively few studies exploit full tracking granularity | Injury-prediction reviews | b5 |
| Current recommendation: ML outputs should be used **only as supportive information** integrated with clinical judgment, athlete history, wellness data and staff expertise - **never in isolation** for selection or return-to-play decisions | Systematic review conclusions | b5, a4, b10 |

This last row is the spine of the whole course. The models are weakest exactly where the stakes
are highest, and a course that teaches shot models without teaching that is misleading.

---

## The simulator - `assets/sports-live.js`

Container class `.sportsbox`. Two modes:

- `data-mode="score"` - the feature ladder. Headline shows **two** numbers, this season (fitted)
  and next season (held out), plus a gap verdict. Below, the 8-shot example set with the model's
  estimate against each shot's true value.
- `data-mode="shots"` - step through one shot at a time and see what each feature is worth on it.
- `data-levers="..."` sets which features start ON. **An empty string legitimately means no
  features** - parsed with `=== null`, never `attr || default`.

Features: `distance` · `angle` · `bodypart` · `pressure` · `keeper`.
ANTI-lever: `reputation` - raw shooter identity and market value added as a feature.
It raises the fitted number by 11 points and drops the held-out number by 6, widening the gap
from 2 points to 19. The model learned who takes the shots, not what makes a shot good.

**Honest nuance that must appear beside the anti-lever (b3):** player effects are not inherently
wrong. Bayesian hierarchical models that POOL player effects with shrinkage genuinely improve
season-level prediction (Bayes-xG). What the anti-lever demonstrates is the naive version - raw
identity and reputation on a small sample, unregularised - which is leakage wearing a jersey.

### Canon numbers - verified 2026-08-26, do not restate differently

| Features on | This season (fitted) | Next season (held out) | Gap |
|---|---|---|---|
| none | 52.0% | 50.0% | 2.0 |
| + distance | 66.0% | 64.0% | 2.0 |
| + angle | 73.0% | 71.0% | 2.0 |
| + body part | 77.0% | 75.0% | 2.0 |
| + defender pressure | 82.0% | 80.0% | 2.0 |
| + keeper position | **85.0%** | **83.0%** | 2.0 |
| all five + ⚠ reputation | 96.0% | 77.0% | **19.0** |

The single most important teaching move on this page: **the fitted number goes UP when the
anti-lever is on.** A learner watching only the first number concludes the feature helped.

The 8-shot set contains one deliberate trap row - a 35m strike with a true value of 0.03 that
WENT IN. With all five features on, the model says 0.03 and is right; with reputation on it says
0.12 because a famous player took it. A shot being scored does not make it a good chance.

---

## Per-session coverage

✓ = taught to the working core · ◐ = touched, deeper elsewhere

### Director track (a1-a6) - sporting directors, club execs, federation and performance leads

| Session | Covers | Bar |
|---|---|---|
| a1 What AI changes across the club | Performance, medical, recruitment and commercial in one picture; what is proven and what is sold | ✓ |
| a2 The data estate of a club | Event, tracking, wearable, medical, video and ticketing data - who owns each, who may see it | ✓ |
| a3 Recruitment and valuation | Models versus scouts, what xG-style metrics do and do not tell you, bias, the transfer market | ✓ |
| a4 Athlete welfare and data rights | Medical data, consent, player representation, GDPR/PDPA, and why ML must not decide selection | ✓ |
| a5 Fans, commercial and integrity | Ticketing, pricing, content, and the betting-integrity rails around any predictive output | ✓ |
| a6 Building the analytics function | Staffing, coach adoption, the one-slide rule, and proving value without overclaiming | ✓ |

### Analyst track (b1-b10) - performance analysts, coaches, data staff

| Session | Covers | Bar |
|---|---|---|
| b1 The sports analyst's AI loop | The analysis loop, the decision line, the feature ladder, both simulator modes | ✓ |
| b2 Event and tracking data 101 | What a row is, event versus tracking, what each can and cannot answer | ✓ |
| b3 Building a shot-quality model | The full feature ladder, the reputation anti-lever, the hierarchical nuance, calibration | ✓ |
| b4 Game film and auto-tagging | Clip packs for coaches, tagging accuracy, and the review pass | ✓ |
| b5 Wearables and load management | The honest injury-model picture, prior injury, imbalance, and supportive-only use | ✓ |
| b6 Opposition analysis | Patterns worth finding, sample size, and the difference between a tendency and a plan | ✓ |
| b7 Scouting and shortlists | Metrics for recruitment, league adjustment, and the human step nobody should skip | ✓ |
| b8 Communicating to coaches | The one-slide rule, uncertainty a coach can act on, and the language that loses the room | ✓ |
| b9 Fan-facing analytics and broadcast | Explaining a probability on air, the integrity rails, and metrics that mislead a viewer | ✓ |
| b10 Capstone: one match, one report | A full match report built and scored against every rail in the track | ✓ |

## Not covered by design

- Medical advice, return-to-play protocols, or anything a clinician owns.
- Legal advice on athlete data, employment or transfer regulation.
- Betting strategy of any kind. Integrity rails are covered; wagering is not.
- Building production data infrastructure - that is the deng bucket.
- Sport-specific coaching methodology. The worked examples use football because the public
  evidence base is deepest there; the pattern transfers.
