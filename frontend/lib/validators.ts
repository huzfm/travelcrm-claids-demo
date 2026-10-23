import { z } from 'zod';

/**
 * E.164 phone format: `+` followed by 7–15 digits total
 * (1–4 digit country code + 6–14 digit subscriber number).
 */
export const e164Regex = /^\+\d{1,4}\d{6,14}$/;

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(e164Regex, 'Phone must include country code (e.g. +91...)');

export const optionalPhoneSchema = z
  .string()
  .optional()
  .refine(
    (v) => !v || v === '' || e164Regex.test(v),
    'Phone must include country code (e.g. +91...)'
  );
