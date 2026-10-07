/**
 * Create (or reactivate) an admin so they can sign in.
 *
 * Sign-in is gated by an email-domain allowlist AND by the admin existing in the
 * DB — there is no self sign-up, so the first admin is provisioned here.
 *
 * Usage (from repo root):
 *   pnpm --filter @starter/api create-admin <email> [name]
 * or set ADMIN_EMAIL / ADMIN_NAME. Reads MONGO_URI from .env / .env.local.
 */
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { AdminModel } from '../src/drivers/mongoose/models/admin.model';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

async function main() {
  const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? '')
    .trim()
    .toLowerCase();
  const name = process.argv[3] ?? process.env.ADMIN_NAME ?? email.split('@')[0];

  if (!email) {
    console.error(
      'Usage: pnpm --filter @starter/api create-admin <email> [name]',
    );
    process.exit(1);
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set (check .env / .env.local).');
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    const existing = await AdminModel.findOne({ email }).exec();
    if (existing) {
      await AdminModel.updateOne(
        { _id: existing._id },
        { $set: { active: true, name } },
      ).exec();
      console.log(
        `Admin already existed — reactivated: ${email} (${String(existing._id)})`,
      );
    } else {
      const _id = randomUUID();
      await AdminModel.create({
        _id,
        email,
        name,
        active: true,
      });
      console.log(`Admin created: ${email} (${_id})`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
