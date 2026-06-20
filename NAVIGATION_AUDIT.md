# PromptFund Navigation Audit

## Primary Navigation

PromptFund now uses a five-item bottom tab navigator in `app/(app)/_layout.tsx`.

| Tab | Route | Screen |
| --- | --- | --- |
| Dashboard | `/dashboard` | Capital command center |
| Projects | `/projects` | Portfolio and project pipeline |
| Investor Feed | `/investor-feed` | Open funding opportunities |
| Wallet | `/wallet` | Fund Points wallet |
| Profile | `/profile` | Builder profile and trust signals |

## Secondary Routes

These routes are intentionally hidden from the tab bar and reachable through in-app actions.

| Route | Reachability |
| --- | --- |
| `/projects/create` | Dashboard quick action, Projects empty state, Projects header action |
| `/projects/[id]` | Project cards, Investor Feed "View progress" action |
| `/funding/request` | Dashboard quick action, Dashboard empty state, Project Details, Expenses empty state |
| `/expenses` | Dashboard quick action |
| `/login` | Root redirect and Register footer |
| `/register` | Login footer |

## State Coverage

The shared UI primitives in `components/ui/Primitives.tsx` include:

- `BrandMark` for PromptFund logo and startup branding.
- `LoadingState` for collection screens while data is being prepared.
- `EmptyState` for zero-data states with contextual calls to action.

Collection screens with loading and empty state branches:

- `/dashboard`
- `/projects`
- `/investor-feed`
- `/expenses`
- `/wallet`

## Navigation Notes

- All visible `Link` usage wraps styled `Pressable` or `Text` children with `asChild`.
- No Expo Router `Link` receives a direct style array.
- Firebase is not implemented; Firestore-like collections are represented by typed local preview data in `data/mockData.ts`.
