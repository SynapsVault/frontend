# SynapsVault backend setup on Stellar testnet

The frontend code cannot supply the backend's missing credentials. Complete the
account steps in your own dashboards and keep all secret values out of chat,
Git, frontend environment variables, and screenshots.

This guide uses **testnet**. Do not substitute a wallet holding real funds.

## 1. Create the Supabase project

1. Create a project at https://supabase.com/dashboard and save its database password.
2. Copy the project URL to the backend Vercel variable `SUPABASE_URL`.
3. In Settings → API Keys, obtain a backend **secret key** and save it as
   `SUPABASE_SERVICE_KEY`. Do not use a publishable/anon key. The backend passes
   this value to the Supabase server client. A legacy service_role key is also
   supported while available.
4. Open **Connect**, select **Session pooler**, and copy the PostgreSQL URI.
   Replace its password placeholder with your database password; URL-encode
   special characters in the password. Save this as `DATABASE_URL`.
5. In Storage, create a **private** bucket named `resources` and set
   `SUPABASE_STORAGE_BUCKET=resources`.

Use the session pooler for the current backend: its postgres.js client does not
disable prepared statements. Switching to the transaction pooler requires
checking that client configuration first. Do not disable TLS certificate checks
to work around connection failures.

Reference: https://supabase.com/docs/guides/database/connecting-to-postgres
and https://supabase.com/docs/guides/getting-started/api-keys

## 2. Create the OpenRouter key

1. Sign in at https://openrouter.ai/settings/keys.
2. Create a key for SynapsVault, with a spending limit you choose.
3. Save it in the backend as `OPENROUTER_API_KEY`.
4. Ensure the account can use the configured model. The backend's current
   default is `anthropic/claude-sonnet-4`; setting a key alone does not establish
   sufficient model access or credits.

Reference: https://openrouter.ai/developers

## 3. Install contract tooling on your own computer

Install Rust using https://rustup.rs and the Stellar CLI using
https://developers.stellar.org/docs/tools/cli/install-cli.

The contracts repository documents Rust 1.91+ and Stellar CLI 25.2+.
Follow its checked-in rust-toolchain.toml when building.

Verify:

```sh
rustc --version
stellar --version
```

Run the remaining commands in the same local terminal and directory context.
On Windows, WSL provides a Linux shell for these commands.

## 4. Create two testnet identities

```sh
git clone https://github.com/SynapsVault/contracts.git SynapsVault-contracts
cd SynapsVault-contracts

stellar keys generate synaps-agent --network testnet --fund
stellar keys generate synaps-registry --network testnet --fund

stellar keys address synaps-agent
stellar keys address synaps-registry
```

The agent public address goes in `PAY_TO`. The registry public address will be
used as the registry admin when initializing the contract.

To obtain the two secret values, run the following **only in your private local
terminal**, copy each directly into backend Vercel settings, and do not send
the output to anyone:

```sh
stellar keys secret synaps-agent
stellar keys secret synaps-registry
```

Map the agent secret to `AGENT_SECRET_KEY` and the registry secret to
`REGISTRY_SECRET_KEY`. Public Stellar account addresses begin with G; secret
seeds begin with S. The registry secret must correspond to the public admin
address chosen below.

Reference: https://developers.stellar.org/docs/build/smart-contracts/getting-started/deploy-to-testnet

## 5. Build, deploy, and initialize the vault registry

From `SynapsVault-contracts`:

```sh
stellar contract build

stellar contract deploy \
  --wasm target/wasm32v1-none/release/vault_registry.wasm \
  --source-account synaps-registry \
  --network testnet
```

Save the returned contract ID, beginning with C. Use that same ID for both
`VAULT_REGISTRY_CONTRACT_ID` and `REGISTRY_CONTRACT_ID`.

Initialize immediately after deployment. Replace the two placeholders with
your actual **public** contract ID and registry account address:

```sh
stellar contract invoke \
  --id YOUR_C_CONTRACT_ID \
  --source-account synaps-registry \
  --network testnet \
  -- init --admin YOUR_G_REGISTRY_PUBLIC_ADDRESS
```

Initialization runs once per contract. Do not redeploy an existing registry
to fix an unrelated environment-variable problem: a new registry has different
storage and a different ID.

Reference: https://github.com/SynapsVault/contracts#deploy-to-stellar-testnet

## 6. Create the database tables

Clone the backend separately from the contracts and frontend:

```sh
git clone https://github.com/SynapsVault/backend.git SynapsVault-backend
cd SynapsVault-backend
npm ci
```

Create a local, uncommitted `.env` containing the same `DATABASE_URL` you saved
in Vercel. For migrations, an accessible direct connection or session pooler
is appropriate. Run:

```sh
npm run db:migrate
```

Wait for migrations to succeed. If they fail, retain the error message and
stop before redeployment; do not delete tables or switch to `db:push` as a
workaround. Never copy your database password into an error report.

Backend migration command: https://github.com/SynapsVault/backend

## 7. Configure the backend in Vercel

In **backend-1bhj → Settings → Environment Variables**, select **Production**.
Keep the URL settings already fixed and supply all real values below.
Angle-bracket values are placeholders, not working credentials.

```dotenv
BASE_URL=https://backend-1bhj.vercel.app
WEB_APP_URL=https://frontend-smoky-psi-49.vercel.app
ALLOWED_ORIGINS=https://frontend-smoky-psi-49.vercel.app

STELLAR_NETWORK=testnet
NETWORK=stellar:testnet
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
PAY_TO=<agent public G address>
AGENT_SECRET_KEY=<agent secret S seed>
REGISTRY_SECRET_KEY=<registry admin secret S seed>
VAULT_REGISTRY_CONTRACT_ID=<deployed C contract ID>
REGISTRY_CONTRACT_ID=<same deployed C contract ID>

OPENROUTER_API_KEY=<your OpenRouter key>
DATABASE_URL=<your PostgreSQL connection URI>
SUPABASE_URL=<your Supabase project URL>
SUPABASE_SERVICE_KEY=<your Supabase backend secret key>
SUPABASE_STORAGE_BUCKET=resources
```

The backend chooses a testnet USDC contract default when `USDC_CONTRACT_ID` is
unset. Do not enter a made-up contract ID or a mainnet asset ID. Network defaults
and config validation live in https://github.com/SynapsVault/backend/blob/main/src/config.ts.

Redeploy the backend after saving all values. Check `/resources` on the new
deployment. A JSON array, including `[]` for a fresh database, is the expected
catalog response. An empty database does not need fake catalog entries.

If validation now succeeds but another error appears, inspect the **new**
deployment's runtime logs. Configuration fixes do not guarantee database,
contract, AI verification, or payment integration will all pass immediately.

## 8. Connect the frontend to the chosen backend

The local frontend `vercel.json`, Docker `nginx.conf`, and Vercel CSP allowlist
now target `backend-1bhj.vercel.app`. Deploy these changes to update the live UI.
The old deployed frontend used `backend-two-virid-26.vercel.app`.

For the repaired frontend on Vercel, use `VITE_API_URL=/api` and
`VITE_NETWORK=testnet`, then redeploy the frontend.

Wallet session sign-in remains a separate integration: the current marketplace
backend does not implement the optional challenge/session service described in
the frontend `.env.example`. Infrastructure setup alone does not add that flow.
