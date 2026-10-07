import { InferSchemaType, Schema, model } from 'mongoose';

const Admin = new Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, unique: true, required: true, index: true },
    name: { type: String },
    photo: { type: String },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'admins',
  },
);

export type AdminModelType = InferSchemaType<typeof Admin>;

export const AdminModel = model('Admin', Admin);
