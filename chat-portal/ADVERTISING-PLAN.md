# SGGVISION AI — Advertising rollout plan

## Phase 1: reserved inventory (implemented)
- Desktop right-rail placement reserved in the chat layout.
- Mobile banner placement reserved separately.
- Both placements are hidden by default; an empty ad box must never appear.
- No ad network scripts or third-party tracking are loaded.

## Phase 2: direct advertiser intake
Before making an inquiry form live, confirm the publisher's official contact email or a supported server-side submission destination. The form should collect:
- Advertiser/business name
- Contact person and reply email/phone
- Product or service category
- Campaign objective and preferred dates
- Creative or landing-page URL
- Consent to be contacted

Do not collect payment-card data or sensitive personal information. Do not claim that a form has been delivered unless the server confirms receipt. Add spam protection and server-side validation before launch.

## Phase 3: campaign management
Build an authenticated admin-only panel with:
- Campaign status: draft, review, approved, scheduled, paused, completed
- Placement: desktop rail or mobile banner
- Start/end dates and destination URL
- Creative preview and approval history
- Impression/click reporting only after a privacy-reviewed measurement design
- Audit log for edits and approvals

Never expose admin controls or secrets in public client-side JavaScript.

## Phase 4: monetization network
Apply to an ad network only after the site has substantial original public content, clear navigation, privacy disclosures and policy compliance. Network approval is not guaranteed. Keep network code disabled until the site and account are approved.

## Editorial and user-trust rules
- Label all paid placements clearly as “जाहिरात” or “प्रायोजित”.
- Ads must not be inserted into AI-generated answers or presented as assistant recommendations.
- Advertisers must not influence model responses, rankings or factual answers.
- Do not place ads where accidental clicks are likely or where they obstruct chat controls.
- Review every direct campaign for legality, rights to creative assets, misleading claims and user safety.
- Do not fabricate audience size, reach, impressions, rates or campaign results. Publish a rate card only after real traffic data supports it.

## Launch gates
- Confirm official SGGVISION advertising contact details.
- Confirm privacy/terms/ad-policy pages and a privacy review.
- Test desktop, tablet and mobile layouts.
- Verify that no ad slot appears when no approved campaign is configured.
- Verify the ad label, destination, dates and creative before enabling a campaign.
- Test the complete submission and admin authorization flow before announcing that advertisers can apply.
