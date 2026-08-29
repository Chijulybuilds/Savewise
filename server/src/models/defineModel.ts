import mongoose, { type Model, type Schema } from 'mongoose';

/**
 * Idempotent model registration.
 *
 * `mongoose.model(name, schema)` throws `OverwriteModelError` if the name is
 * already compiled. That happens whenever the module graph is re-evaluated
 * against a live Mongoose instance — the test runner isolating each file, a dev
 * server hot-reloading, a serverless handler reusing a warm container.
 *
 * Mongoose's registry is global to the process, so returning the existing model
 * is both correct and what every one of those environments actually wants.
 */
export function defineModel<TSchema, TModel = Model<TSchema>>(
  name: string,
  // Mongoose's `Schema` generic carries several internal `any`s that do not
  // survive being passed through a wrapper. The signature above is the honest
  // one for callers; this parameter is deliberately loose so the indirection
  // does not force an `any` into every model file.
  schema: Schema<TSchema, TModel> | Schema<TSchema, never>,
): TModel {
  const existing = mongoose.models[name] as TModel | undefined;
  return existing ?? mongoose.model<TSchema, TModel>(name, schema as Schema<TSchema, TModel>);
}
