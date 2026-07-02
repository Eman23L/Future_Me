# FutureMe Scheduling Rules

## Fixed Commitments

Fixed commitments are placed before flexible activities:

- Work.
- Appointments.
- Deadlines.
- Social events.
- Sleep anchors.

## Flexible Activities

Flexible activities can be placed around fixed commitments:

- Gym.
- Cleaning.
- Meal prep.
- Food shop.
- Self-care.

## Capacity Labels

- I have plenty in me.
- I feel steady.
- I need a softer week.
- Just the essentials.

## Capacity-Based Frequency Rules

| Activity | Plenty | Steady | Softer | Essentials |
| --- | ---: | ---: | ---: | ---: |
| Gym | 3x | 2x | 1x | 0x |
| Cleaning | 2x | 1x | 1x | 0x |
| Meal prep | 3x | 2x | 1x | 1x |
| Food shop | 2x | 2x | 1x | 0x |
| Self-care | 4x | 4x | 5x | 5x |

Current internal scheduler labels map approximately to: `high` = plenty, `normal` = steady, `tired` = softer, `survival` = essentials.

## Preferred Time Windows

- Gym: 08:00-12:00.
- Cleaning: 09:00-16:00.
- Food shop: 13:00-18:00.
- Meal prep: 13:00-19:00.
- Self-care: 18:00-22:00, fallback 10:00-16:00.

## Rules

- No gym after 12+ hour shift.
- No gym morning after late shift.
- No food shop at 06:30.
- No meal prep early morning.
- No cleaning late at night.
- Do not schedule outside wake/bedtime.
- Avoid overloading days.
- Respect fixed commitments first.
- Flexible tasks may move; fixed commitments should not move automatically.
