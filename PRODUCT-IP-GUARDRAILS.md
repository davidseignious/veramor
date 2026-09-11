# VERAMOR product IP guardrails

These are engineering/design guardrails, not a legal clearance or a substitute for patent/trademark counsel.

## Default rules

- Build original VERAMOR interaction patterns, wording, layout, motion, icon treatment, and visual identity.
- Do not copy competitor screenshots, source code, proprietary illustrations, photos, sound effects, microcopy, onboarding copy, or distinctive animations.
- Do not use competitor product names or trademarked feature names as VERAMOR feature names.
- Common product concepts (profiles, messaging, filters, calls, prompts, reporting, verification) should be implemented with original UX and branding.
- Before reproducing a signature competitor interaction, run a patent/trademark/design review first.

## Swipe / preference interaction

Do not implement a gesture where a swipe itself records a positive/negative dating preference and automatically advances to the next profile without specific legal clearance. Match Group/Tinder has active U.S. patent-family claims around profile matching where a positive preference is determined from a swiping gesture and the next potential match is then displayed (including US9733811B2 and related continuations).

VERAMOR's current safer interaction is intentionally different: a horizontal card drag only reveals the action choices. The user must explicitly tap **Skip**, **Connect**, or **Signal** to submit a preference.

## Naming

Use VERAMOR-native language where possible. Current preferred action language:

- Skip = no preference / move on
- Connect = standard positive interest
- Signal = stronger interest

Any feature name intended for public branding should still receive a current trademark/common-law search before launch.

## Release checklist for new features

1. Is the implementation original rather than pixel-for-pixel or motion-for-motion copying?
2. Does the copy avoid competitor phrases and branded feature names?
3. Does it use VERAMOR colors, spacing, icon language, and information architecture?
4. Could it implicate an active software/design patent? If yes, stop and review before shipping.
5. Are all images, video, audio, fonts, and third-party assets licensed or owned?
6. Is any third-party integration using an official API/SDK or linking users directly to the provider rather than collecting credentials?

If any answer is uncertain, treat the feature as needing review before production launch.