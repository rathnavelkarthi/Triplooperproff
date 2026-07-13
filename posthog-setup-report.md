<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics and LLM observability into this Triplooper hospitality SaaS. PostHog is initialized in `src/main.tsx` via the `posthog-js` npm package, keyed from environment variables. Twelve business events are now captured across the guest booking flow, the B2B signup funnel, the CRM admin login, and the in-stay guest portal. Users are identified on login/signup and unlinked on logout. The Gemini AI OCR call in the guest portal is also instrumented with `$ai_generation` events for full LLM observability.

| Event name | Description | File |
|---|---|---|
| `availability_checked` | Fired when a user submits the booking bar to check room availability. | `src/components/BookingBar.tsx` |
| `room_selected` | Fired when a guest selects a room during the booking flow. | `src/components/RoomSelector.tsx` |
| `guest_details_submitted` | Fired when the guest details form passes validation and is submitted. | `src/components/GuestForm.tsx` |
| `booking_payment_confirmed` | Fired when the guest clicks the pay and confirm button on the payment page. | `src/components/PaymentSection.tsx` |
| `booking_completed` | Fired when the confirmation page renders with a valid booking. | `src/components/ConfirmationPage.tsx` |
| `invoice_downloaded` | Fired when a guest downloads the booking invoice PDF. | `src/components/ConfirmationPage.tsx` |
| `whatsapp_confirmation_clicked` | Fired when a guest clicks the WhatsApp confirmation link after booking. | `src/components/ConfirmationPage.tsx` |
| `signup_started` | Fired when a B2B user begins the property onboarding signup flow. | `src/pages/Signup.tsx` |
| `signup_completed` | Fired when a B2B property owner successfully creates an account. | `src/pages/Signup.tsx` |
| `admin_login_success` | Fired when a staff member successfully logs into the CRM dashboard. | `src/pages/crm/Login.tsx` |
| `guest_food_order_placed` | Fired when an in-house guest submits a food order from the guest portal. | `src/pages/guest/GuestFoodOrder.tsx` |
| `guest_service_requested` | Fired when an in-house guest submits a service request from the guest portal. | `src/pages/guest/GuestServices.tsx` |

## LLM analytics

The guest portal's Aadhaar OCR feature calls `gemini-2.5-flash` via the Google Generative Language REST API. Each call now emits a `$ai_generation` event via `posthog.capture` in `src/pages/guest/GuestPortal.tsx`. The event includes:

| Property | Value |
|---|---|
| `$ai_trace_id` | Per-call `crypto.randomUUID()` |
| `$ai_span_name` | `aadhaar_ocr` |
| `$ai_model` | `gemini-2.5-flash` |
| `$ai_provider` | `google` |
| `$ai_input_tokens` | From `usageMetadata.promptTokenCount` |
| `$ai_output_tokens` | From `usageMetadata.candidatesTokenCount` |
| `$ai_latency` | Wall-clock seconds for the fetch round-trip |
| `$ai_http_status` | HTTP status code |
| `$ai_stop_reason` | `candidates[0].finishReason` |
| `$ai_is_error` / `$ai_error` | Set on the error path |

No PII is sent — the base64 image data and extracted Aadhaar fields (name, address, DOB) are intentionally excluded from event properties.

View generations in PostHog → [AI Observability → Generations](https://us.posthog.com/project/510600/ai-observability/generations)

User identification (`posthog.identify`) is called:
- On B2B signup completion in `src/pages/Signup.tsx`
- On CRM admin email login in `src/pages/crm/Login.tsx`
- On every authenticated session load in `src/context/AuthContext.tsx` (handles page refresh)
- `posthog.reset()` is called on logout in `src/context/AuthContext.tsx`

## Next steps

We've built a dashboard and five insights to keep an eye on user behavior:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/510600/dashboard/1841672)
- [Booking conversion funnel (wizard)](https://us.posthog.com/project/510600/insights/GeLZpi27)
- [Bookings completed over time (wizard)](https://us.posthog.com/project/510600/insights/CPVcU3uj)
- [B2B signup funnel (wizard)](https://us.posthog.com/project/510600/insights/SXooi4mS)
- [Payment method breakdown (wizard)](https://us.posthog.com/project/510600/insights/vl3Vxqpp)
- [Guest portal activity (wizard)](https://us.posthog.com/project/510600/insights/TdKPitNl)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite (`npm test`) — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `VITE_PUBLIC_POSTHOG_KEY` and `VITE_PUBLIC_POSTHOG_HOST` to `.env.example` and any CI/bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload into CI so production stack traces de-minify (use `posthog-cli sourcemap` or Vite's source-map upload step).
- [ ] Confirm the returning-visitor path also calls `identify` — the `useEffect` in `AuthContext` handles this for authenticated staff, but verify it also fires for guests who return to the booking flow with an existing session.
- [ ] Trigger the Aadhaar OCR flow with a real `VITE_GEMINI_API_KEY` and confirm `$ai_generation` events appear in [PostHog AI Observability → Generations](https://us.posthog.com/project/510600/ai-observability/generations).

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_web/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
