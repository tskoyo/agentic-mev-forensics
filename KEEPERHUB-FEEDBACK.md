# KEEPERHUB-FEEDBACK.md

> **Author**: Independent developer integrating KeeperHub into [agentic-mev-forensics](https://github.com/tskoyo/agentic-mev-forensics)
> **Date**: 2026-04-25
> **Context**: Building an MEV investigation agent that uses KeeperHub to guarantee Tenderly webhook delivery to `POST /webhook/tenderly`, triggering automated trade analysis.

---

## Overview

I attempted to integrate KeeperHub into the agentic-mev-forensics project — an MEV forensics agent built for ETHGlobal OpenAgents 2026. The integration pattern described in the project README is:

```
Tenderly simulation fires webhook
    → KeeperHub guarantees delivery to POST /webhook/tenderly
        → Investigation starts automatically
```

This document records specific friction points encountered during integration, with reproduction steps and actionable suggestions.

---

## Friction Point #1: No Programmatic API or SDK for Webhook Receivers

### What was encountered

KeeperHub is exclusively a UI-driven platform. There is no npm package, REST API, or CLI for programmatically creating workflows, configuring webhook triggers, or managing webhook endpoints from code. The `packages/keeperhub/` directory in the project skeleton is empty — there is no SDK to install.

For a developer building an automated system (MEV agent that needs webhook-triggered investigations), this means:
- Every webhook endpoint must be configured manually through the web UI
- There is no way to automate workflow setup in CI/CD or infrastructure-as-code
- The project cannot declare KeeperHub as a dependency in `package.json`

### Steps to reproduce

1. Navigate to [npmjs.com](https://www.npmjs.com) and search for `@keeperhub/sdk` or `keeperhub` — no results
2. Check the [KeeperHub GitHub repo](https://github.com/KeeperHub/keeperhub) — it's a Next.js frontend app, not an SDK
3. Review the [KeeperHub docs](https://docs.keeperhub.com) — all integration guides are UI-clickthrough tutorials
4. Attempt to find a REST API endpoint for webhook management — none documented

### What would be better

- **Publish an npm package** (`@keeperhub/node` or similar) that allows:
  - Creating webhook trigger workflows programmatically
  - Retrieving the webhook URL for a given workflow
  - Listing active webhook endpoints
- **Document a REST API** for workflow management (even if beta), with authentication via API keys
- **Provide a Terraform provider or Pulumi package** for infrastructure-as-code users

**Impact**: High. This is the single biggest blocker for developers who want to integrate KeeperHub into automated systems rather than manual dashboards.

---

## Friction Point #2: Webhook Receiver Documentation is Missing

### What was encountered

The KeeperHub documentation has a [Webhook Plugin](https://docs.keeperhub.com/plugins/webhook) page, but it only covers **sending** webhooks (outbound HTTP POST requests from KeeperHub workflows). There is no documentation for **receiving** webhooks — the scenario where an external service (like Tenderly) sends a webhook TO KeeperHub, which then triggers a workflow.

The [Creating Workflows](https://docs.keeperhub.com/workflows/creating) page mentions "Webhook" as a trigger node type, but provides no details on:
- How to obtain the webhook URL that external services should POST to
- What the webhook payload format looks like when received
- How to extract fields from the incoming webhook body for use in downstream nodes
- Whether webhook triggers support signature verification (e.g., `X-Tenderly-Signature` headers)
- Rate limiting or payload size limits

### Steps to reproduce

1. Go to [KeeperHub docs → Plugins → Webhook](https://docs.keeperhub.com/plugins/webhook)
2. Read the entire page — it only describes the "Send Webhook" action (outbound)
3. Go to [Creating Workflows](https://docs.keeperhub.com/workflows/creating) → "Trigger Configuration" section
4. Find "Webhook URL: Provided URL for webhook triggers" — but no explanation of how this URL is provided or where it comes from
5. Search the docs for "webhook trigger" or "receive webhook" — no results
6. Check the [Workflows Examples](https://docs.keeperhub.com/workflows/examples) page — no webhook trigger examples

### What would be better

- Add a dedicated **"Webhook Triggers"** page covering:
  - How to create a workflow with a webhook trigger
  - How to obtain and share the webhook URL
  - Payload format and field extraction syntax (e.g., `{{Webhook.body.txHash}}`)
  - Header access (e.g., `{{Webhook.headers['x-signature']}}`)
  - Example: "Receive a Tenderly simulation webhook and forward to Discord"
- Add a **"Receiving Webhooks"** section to the Webhook Plugin page, clearly distinguishing inbound vs outbound
- Provide a **webhook testing tool** (like RequestBin) built into the KeeperHub UI so developers can test without deploying a real endpoint

**Impact**: High. Without documentation, developers must reverse-engineer the webhook trigger flow through trial and error, which is error-prone and time-consuming.

---

## Friction Point #3: No Webhook Delivery Guarantee Documentation

### What was encountered

The agentic-mev-forensics README states: *"Running a Tenderly simulation fires a webhook → KeeperHub guarantees delivery to `POST /webhook/tenderly`"*. However, there is no documentation from KeeperHub explaining what "guarantees delivery" actually means in practice.

Key unanswered questions:
- **Retry policy**: How many times does KeeperHub retry a failed webhook delivery? What's the backoff strategy?
- **Dead letter queue**: What happens to webhooks that consistently fail? Is there a DLQ or error log?
- **Idempotency**: Does KeeperHub deduplicate webhook deliveries, or could the same Tenderly simulation trigger multiple investigation runs?
- **Timeout**: What's the timeout for webhook processing? If the investigation agent takes 30 seconds to respond, does KeeperHub retry?
- **TLS requirements**: Does KeeperHub accept self-signed certificates for development? What TLS versions are supported?

### Steps to reproduce

1. Read the [Platform Benefits](https://docs.keeperhub.com/intro/benefits) page — no mention of delivery guarantees
2. Search the docs for "retry", "delivery", "guarantee", "dead letter" — no results
3. Check the [Troubleshooting](https://docs.keeperhub.com/keeper-runs/troubleshooting) page — no webhook-specific troubleshooting
4. Check the [Security Best Practices](https://docs.keeperhub.com/practices/security) page — no webhook security guidance
5. Review the [Keeper Runs → Status and Logs](https://docs.keeperhub.com/keeper-runs/status-logs) page — mentions run status but not webhook delivery status

### What would be better

- Add a **"Delivery Guarantees"** section to the documentation covering:
  - Retry policy (count, backoff, jitter)
  - Dead letter handling and error visibility
  - Idempotency guarantees (or lack thereof)
  - Timeout configuration
  - TLS/certificate requirements
- Provide a **webhook delivery dashboard** showing:
  - Recent webhook deliveries with status (success/failed/pending)
  - Retry history for each delivery
  - Payload preview for debugging
- Add **webhook signature verification** support (HMAC signatures) so receivers can authenticate that webhooks came from KeeperHub

**Impact**: Medium-High. For production MEV systems, webhook delivery reliability is critical. A missed webhook means a missed investigation, which means lost insights into trade performance.

---

## Friction Point #4: No Local Development or Testing Support

### What was encountered

There is no way to test KeeperHub webhook integrations locally. The entire platform runs on KeeperHub's cloud infrastructure (`app.keeperhub.com`), and there is no:
- Local development server
- Docker image
- CLI for testing workflows offline
- Mock webhook server for development

For the agentic-mev-forensics project, this means:
- You cannot test the Tenderly → KeeperHub → investigation pipeline without deploying to KeeperHub's cloud
- You cannot simulate a Tenderly webhook payload without actually running a Tenderly simulation
- Debugging webhook issues requires checking KeeperHub's cloud logs, not local output

### Steps to reproduce

1. Search the KeeperHub GitHub repo for "docker", "local", "dev server" — no results
2. Check the [Getting Started](https://docs.keeperhub.com/getting-started) guide — only covers cloud signup
3. Check the [Quick Start](https://docs.keeperhub.com/getting-started/quickstart) — no mention of local development
4. Review the repo's `package.json` scripts — no `dev` or `start` script for local workflow testing

### What would be better

- **Provide a CLI tool** (`keeperhub dev`) that:
  - Exposes a local webhook endpoint (e.g., `localhost:3000/webhook`)
  - Forwards received webhooks to a local workflow runner
  - Shows execution logs in the terminal
- **Provide a Docker Compose setup** for running KeeperHub locally (even in a limited "dev mode")
- **Add a webhook simulator** in the web UI where developers can:
  - Paste a JSON payload
  - Select a target workflow
  - Execute it and see the results
- **Support ngrok/tunnel integration** so local `POST /webhook/tenderly` endpoints can receive webhooks from KeeperHub during development

**Impact**: Medium. Slows down development iteration significantly. Each test requires deploying to cloud, which adds 5-10 minutes of overhead per iteration.

---

## Friction Point #5: Workflow Variable Syntax is Under-documented

### What was encountered

KeeperHub workflows use a template syntax `{{NodeId.Label.field}}` to reference outputs from previous nodes. However, the documentation does not clearly explain:
- What fields are available from each node type (e.g., what does a Webhook trigger node expose?)
- How to access nested JSON fields from webhook payloads
- What happens when a referenced field doesn't exist (silently fails? throws error?)
- Whether there's a type system (can you do arithmetic on referenced values?)

For the MEV forensics use case, this is critical because the Tenderly webhook payload contains nested JSON with transaction data that needs to be extracted and passed to the investigation agent.

### Steps to reproduce

1. Go to [Creating Workflows](https://docs.keeperhub.com/workflows/creating) → "Condition Configuration"
2. Find examples like `{{CheckBalance.Balance.value}}` — but no explanation of where `.value` comes from
3. Search for "variable syntax", "template reference", "node output" — no dedicated documentation
4. Check the [Expression Mode](https://docs.keeperhub.com/workflows/creating) section — mentions arithmetic but not where the data comes from
5. Try to find documentation on what fields a "Webhook Trigger" node exposes — none exists

### What would be better

- Add a **"Data Flow & Variables"** page documenting:
  - The `{{NodeId.Output.field}}` syntax with a formal grammar
  - Available fields for each node type (like an API reference)
  - Type coercion rules (string → number, etc.)
  - Error handling for missing fields
- Add a **variable picker** in the workflow builder UI that shows available fields when editing node configurations
- Provide **example payloads** for each trigger type so developers know what data they'll receive

**Impact**: Medium. Without clear variable documentation, developers spend time guessing field names and debugging silent failures.

---

## Summary

| # | Friction Point | Severity | Effort to Fix |
|---|----------------|----------|---------------|
| 1 | No SDK/programmatic API | **High** | Medium (requires new package + API) |
| 2 | Missing webhook receiver docs | **High** | Low (documentation only) |
| 3 | No delivery guarantee documentation | **Medium-High** | Low-Medium (docs + dashboard) |
| 4 | No local development support | **Medium** | High (requires CLI/docker) |
| 5 | Under-documented variable syntax | **Medium** | Low (documentation only) |

**Overall impression**: KeeperHub has a solid visual workflow builder and a growing plugin ecosystem. However, for developers building automated systems (like MEV agents), the lack of programmatic interfaces and webhook receiver documentation creates significant friction. The platform is currently optimized for manual dashboard users, not for developers who need to integrate KeeperHub into code-driven workflows.

**Recommendation**: Prioritize items #2 and #5 (documentation fixes) as quick wins. These can be resolved in a single documentation sprint and would immediately improve the developer experience for anyone integrating KeeperHub into automated systems.

---

## Integration Context

This feedback was generated while attempting to integrate KeeperHub into the [agentic-mev-forensics](https://github.com/tskoyo/agentic-mev-forensics) project, an MEV investigation agent for ETHGlobal OpenAgents 2026. The integration goal was to use KeeperHub as a reliable webhook delivery layer between Tenderly simulations and the investigation agent's API endpoint.

**Project architecture**:
```
Tenderly (simulation)
    → Webhook (HTTP POST)
        → KeeperHub (delivery guarantee)
            → POST /webhook/tenderly (agentic-mev-forensics API)
                → MEV Investigation Agent (Claude + viem + pool-math)
```

**Tech stack**: TypeScript, pnpm workspaces, Hono API server, Claude API, Tenderly REST API, viem.
