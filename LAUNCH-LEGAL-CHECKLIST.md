# VERAMOR public-launch legal checklist

This checklist tracks legal/compliance work that cannot be fully solved by UI/code alone. Friend Beta may continue while these items are being completed, but broad public/paid launch should wait for sign-off.

## Implemented in product

- Explicit signup acceptance for current Terms and Privacy versions.
- Separate dating-safety/background-screening acknowledgements during signup.
- Clear statement that VERAMOR does not conduct criminal background screenings.
- Background-screening notice shown at signup and on profile views.
- Dating Safety Center linked from the first entry/signup experience.
- Safety notice covering caution with strangers, personal/financial information, public meetings, transportation, suspected minors, and child sexual exploitation.
- Profile verification clearly distinguished from a criminal background check.
- Current Friend Beta states it does not create face-geometry templates or automated facial-recognition profiles from the verification video.
- Streaming credentials remain outside VERAMOR.
- YouTube Terms/Google Privacy references added.
- Profile Passport public branding renamed to Profile Link.
- Public match-copy guard changes "It's a match" to VERAMOR-native "You connected".
- Public stronger-interest action uses Signal rather than Super Like.
- Copyright/takedown and repeat-infringer policy page added.
- Product IP guardrails retained for future design work.

## Must be completed before broad public launch

1. **Operating entity and legal contact**
   - Finalize the LLC/corporation that operates VERAMOR.
   - Publish its legal name, mailing address, privacy contact, safety contact, copyright/DMCA contact, and customer-support channel.
   - Ensure founders, contractors, and developers assign relevant VERAMOR IP to that entity.

2. **Counsel review of dating-service state laws**
   - Have U.S. product/privacy counsel review current Illinois, Texas, New Jersey, New York, and any other applicable dating-service disclosure laws against the final signup, profile, email, and messaging flows.
   - Confirm whether free and paid versions trigger different statutory definitions.

3. **Trademark clearance**
   - Run full U.S. trademark/common-law clearance for VERAMOR and any major public feature names before substantial marketing spend or filing.
   - Search federal/state marks, app stores, web, social handles, domains, and dating/software services.

4. **Patent/FTO review**
   - Obtain patent counsel review for preference-card gestures and other signature matching interactions.
   - Keep the current rule that dragging a profile never itself records the preference; explicit Skip/Connect/Signal tap is required unless counsel clears another flow.

5. **DMCA designated agent**
   - If relying on U.S. DMCA safe-harbor protections for user uploads, register and maintain the designated agent with the U.S. Copyright Office and publish the required contact information.

6. **Biometric review before automation**
   - Do not add face geometry, automated face recognition, biometric matching, or voiceprints without a separate legal/privacy review, appropriate notices/consents, retention schedule, vendor terms, and state-law analysis.

7. **Moderation operations**
   - Document internal response procedures for suspected minors, apparent CSAM/child sexual exploitation, threats, stalking, scams, impersonation, non-consensual intimate content, and emergency requests.
   - Define moderator access, audit logs, evidence preservation, escalation, appeals, and response targets.
   - Counsel should determine applicable NCMEC/CyberTipline reporting obligations.

8. **Vendor/data-processing review**
   - Inventory Supabase, Vercel, Cloudinary, email providers, analytics, AI providers, moderation providers, social integrations, and any other processors.
   - Confirm DPAs/security terms, retention, deletion behavior, subprocessors, breach notice, and international data transfer terms.

9. **Paid subscriptions**
   - Keep public paid billing disabled until App Store/Google Play rules, auto-renew disclosures, cancellation, refunds, taxes, receipts, and state subscription laws are reviewed and implemented.

10. **International account registration**
   - Treat International Browse separately from international account availability.
   - Do not market broad EU/EEA/UK account registration until GDPR/UK GDPR controller disclosures, legal bases, special-category data handling, data-subject rights, retention, processor contracts, and transfer mechanisms are completed.

11. **Final launch documents**
   - Replace Friend Beta-only provisions with final public Terms, Privacy Notice, Safety rules, subscription terms, operating-entity details, and dispute/governing-law provisions reviewed by counsel.

## Release gate

No one should label VERAMOR "legally cleared," "fully compliant," or "lawsuit-proof" based only on this repository. Final public launch requires the external items above and counsel sign-off on the final product behavior and documents.
