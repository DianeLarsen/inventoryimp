# InventoryImp

InventoryImp is a household grocery-inventory app that helps people keep track of what they already have, avoid duplicate purchases, and make the weekly grocery run less of a guessing game.

**Live site:** [inventoryimp.com](https://inventoryimp.com)

## What it does

- Creates a separate inventory for each signed-in household
- Adds items manually, through product search, or by barcode
- Tracks quantity, storage location, package size, expiration date, and low-stock thresholds
- Looks up product details from USDA FoodData Central and Open Food Facts
- Lets users import a structured grocery list for free
- Offers AI-assisted receipt text and photo parsing with review before anything is saved
- Supports a Home plan and trial through Clerk feature gating

## Built with

- Next.js 16, React 19, TypeScript, and Tailwind CSS
- Clerk for authentication, user management, and feature gating
- PostgreSQL with Prisma ORM
- OpenAI Responses API for receipt parsing
- USDA FoodData Central and Open Food Facts for product enrichment
- Vercel for deployment

## Run locally

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Add your Clerk and PostgreSQL credentials. Add an OpenAI API key if you want to use AI receipt parsing. See [`.env.example`](.env.example) for the full list.

4. Apply database migrations and start the app:

   ```bash
   npx prisma migrate deploy
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Project status

The inventory workflow is live. Recipe suggestions and grocery planning are the next planned features.

## License

This project is licensed under the [MIT License](LICENSE).
