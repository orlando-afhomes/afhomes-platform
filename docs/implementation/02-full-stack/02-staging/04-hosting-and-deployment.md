# 04 · Staging Hosting and Deployment

[Staging index](README.md) · Previous: [Backend, API, and storage](03-backend-api-and-file-storage.md) · Next: [Release rehearsal](05-release-rehearsal-and-sign-off.md)

## Start when

The hosted pilot works, all approved modules have passed their local checks for the full rehearsal, and the owner authorizes the necessary staging billing and deployment. Keep Spark for the trial until paid features are approved.

## Tools and steps

1. After billing approval, prepare the paid staging environment. Apply the full reviewed schema and connector changes over the pilot baseline, load synthetic fixtures for all approved modules, and record migration and connector versions. Confirm staging-only credentials, staff roles, private Firebase Storage, and database constraints before connecting the full app.
2. Check the production-candidate Next.js and Node.js versions against the current [App Hosting support schedule](https://firebase.google.com/docs/app-hosting/frameworks-tooling). Verify the actual build on **Firebase App Hosting**, including routing, server rendering, `/api/v1`, Firebase sign-in, private Firebase Storage, and SQL Connect.
3. If App Hosting fails the compatibility checks, document the failure and rehearse **Cloud Run** in the same staging Google project using the same application. Select the host based on the successful staging checks. Keep HTTPS, the expected runtime identity, and staging-only configuration in either setup.
4. Have the owner deploy the identified build and record the revision, runtime, Firebase project, service location, logs view, and prior known-good release. Configure rollout settings so production releases remain under owner control.
5. Run smoke checks for public entry, staff sign-in, permissions, the receipt workflow, reporting, and upload and download. Check that production-mode UI has no mock identity controls or temporary developer links.

[App Hosting setup](https://firebase.google.com/docs/app-hosting/get-started) · [Next.js on Cloud Run](https://docs.cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service)

## Verify

Record the successful hosting target, the failed check if a fallback was used, and the exact release and configuration to rehearse. Treat the App Hosting and Cloud Run alternatives as planned until an actual deployment passes.
