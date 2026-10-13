# ClamAV Cloud Run candidate — preparation only

Status: local candidate. It is not connected to production and must not be
deployed before the isolated and shadow phases below pass.

## Invariants

- Upload is persisted in a private quarantine bucket before enqueue.
- The task contains only `assetId`; the worker retrieves the private object.
- `CLEAN` advances only to `PENDING_MODERATION`.
- `INFECTED` becomes `REJECTED`.
- unavailable scanner, timeout, stale signatures and invalid responses remain
  `QUARANTINED` with `malwareStatus=ERROR`.
- The worker never promotes media and never changes moderation or age gates.
- A unique database job plus an expiring lease provides idempotency.

## Durable delivery design

`MalwareScanJob` is the source of truth. Cloud Tasks is the intended transport.
The future upload transaction creates/upserts the job and an outbox dispatcher
creates a task with an OIDC token. Cloud Run must require IAM authentication;
the header check in the worker is defense in depth, not a replacement for IAM.

Use deterministic Cloud Task names derived from `assetId`. A duplicate delivery
returns success after the conditional database claim fails. Operational errors
use exponential retry, capped at one hour. Exhausted work stays quarantined and
requires an operational alert or manual retry.

The production upload route remains synchronous until the candidate completes
its isolated, shadow and canary validations. This repository preparation does
not call `enqueueMalwareScan` from the production route.

## Signatures

The Docker build installs a current signature database. At cold start,
`freshclam` receives up to 120 seconds to obtain deltas. Every health check and
scan independently rejects a database older than the configured maximum age
(48 hours by default). A network failure can use the baked database only while
it remains fresh. A future scheduled signature image rebuild or private,
versioned signature bundle should run at least daily.

## Isolated validation

1. Build locally; record image size and build-time signature timestamp.
2. Start with a 2 GiB memory limit, 1 CPU and concurrency 1.
3. Run `smoke-test.sh` inside the container.
4. Exercise clean, EICAR, clamd stopped, forced timeout, duplicate task and a
   signature timestamp older than 48 hours.
5. Test files at 1 MiB, 25 MiB, 100 MiB and the configured 250 MiB ceiling.
6. Record startup P50/P95, scan P50/P95, peak RSS and temporary disk use.
7. Verify logs contain asset IDs and timings only—never body, signed URL, token,
   filename, CPF, document or media bytes.

## Shadow comparison

Do not route real uploads to the candidate during preparation. In the approved
shadow phase, use synthetic files stored in an isolated private bucket. Run the
same corpus through the current VM and candidate, comparing only normalized
results, engine version, signature version, duration and resource usage.

Required equality: clean corpus = CLEAN; EICAR = INFECTED; operational failures
= ERROR. Any disagreement blocks canary.

## Canary and rollback

1. Apply the migration and deploy the private worker with min 0/max 3.
2. Verify IAM and Cloud Tasks OIDC with synthetic assets only.
3. Shadow compare results.
4. Enable asynchronous enqueue for an explicitly selected test cohort.
5. Increase gradually while the VM remains healthy and available.
6. Roll back by disabling enqueue and restoring the synchronous VM gateway.
7. Drain queued jobs or leave assets quarantined; never bypass scanning.
8. Remove VM, disk, NAT and reserved resources only after the rollback window
   and billing verification are complete.

## Expected experimental cost

No resources were created by this preparation. A short Cloud Run experiment
with synthetic files should normally remain within free allowances, but budget
for approximately R$ 0–20 for Cloud Run CPU/RAM, Artifact Registry, build,
logging and task operations. This is an estimate, not a guaranteed invoice.
Configure a budget alert before deployment and inspect gross cost without
promotional credits.

## Remaining blockers

- Real container build and ClamAV smoke test.
- Peak memory and temporary storage measurements at the 250 MiB limit.
- Cloud Tasks OIDC and least-privilege service account validation.
- Database migration rehearsal and rollback rehearsal.
- Billing account status and Cloud Run quota confirmation.
- Shadow comparison and production canary authorization.

## Production commands (prepared, not executed)

Replace every uppercase placeholder and review the active project before use.
These commands intentionally stop before changing production.

```sh
gcloud services enable cloudtasks.googleapis.com cloudscheduler.googleapis.com run.googleapis.com artifactregistry.googleapis.com
gcloud tasks queues create elitemodell-malware-scan --location=southamerica-east1 \
  --max-concurrent-dispatches=3 --max-dispatches-per-second=1 \
  --max-attempts=12 --min-backoff=30s --max-backoff=3600s --max-doublings=7
gcloud iam service-accounts create elitemodell-malware-task-invoker
gcloud iam service-accounts create elitemodell-malware-worker
gcloud run services add-iam-policy-binding elitemodell-clamav \
  --region=southamerica-east1 \
  --member=serviceAccount:elitemodell-malware-task-invoker@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/run.invoker
```

After the private service exists, create one Scheduler job (one-minute cadence)
that sends an authenticated OIDC `POST` to `/tasks/dispatch` with header
`X-CloudScheduler: true`. The scheduler identity receives only
`roles/run.invoker`. The header is defense in depth and is never treated as the
identity boundary; Cloud Run IAM performs authentication.

```sh
gcloud scheduler jobs create http elitemodell-malware-dispatch \
  --location=southamerica-east1 --schedule='* * * * *' \
  --uri='REPLACE_PRIVATE_CLOUD_RUN_URL/tasks/dispatch' --http-method=POST \
  --headers='X-CloudScheduler=true' \
  --oidc-service-account-email='REPLACE_SCHEDULER_INVOKER_SERVICE_ACCOUNT' \
  --oidc-token-audience='REPLACE_PRIVATE_CLOUD_RUN_URL'
```

The task creator needs `roles/cloudtasks.enqueuer` on the queue and
`roles/iam.serviceAccountUser` on the OIDC invoker identity. The Cloud Tasks
service agent must retain its automatically granted
`roles/cloudtasks.serviceAgent`; legacy projects require verification. The worker identity gets Secret Manager access only to the three
referenced secrets; it does not get Storage Admin because downloads use a
short-lived signed URL issued with the existing private storage credential.

Build and deployment must use an immutable image digest. Deploy the candidate
with `minScale=0`, concurrency 1, 1 CPU, 2 GiB, request timeout 600 seconds and
Cloud Run authentication required. Do not allow unauthenticated invocation.

Migration order after explicit approval: rehearse against an isolated database,
back up production, run `prisma migrate deploy`, verify the new table/indexes,
deploy the private worker, create the queue/IAM, then enable enqueue only for a
synthetic canary. Rollback disables enqueue first; queued assets stay private
and quarantined.

## Alerts to create before canary

- Cloud Tasks oldest task age above 15 minutes or queue depth increasing for 10 minutes.
- Worker 5xx rate above 5%, instance OOM, or P95 request latency above 5 minutes.
- `MalwareScanJob` in `FAILED`, expired `PROCESSING`, or overdue `QUEUED/RETRY`.
- ClamAV signature age above 36 hours (warning) and 48 hours (hard failure).
- Billing budget thresholds at 50%, 80% and 100% of the approved monthly amount.
