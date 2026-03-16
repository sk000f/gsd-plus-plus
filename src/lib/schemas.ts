import { z } from "zod";

export const GsdPPConfigExtensionSchema = z.object({
  workflow: z.object({
    code_review: z.boolean(),
    generate_docs: z.boolean(),
    review_max_cycles: z.number().int().min(1).max(5),
  }),
  review: z.object({
    block_on_critical: z.boolean(),
    enforce_claude_md: z.boolean(),
  }),
  documentation: z.object({
    output_dir: z.string(),
    api_spec_format: z.enum(["yaml", "json"]),
    adr_dir: z.string(),
    auto_update_readme: z.boolean(),
    doc_types: z.array(z.enum(["api", "technical", "adr", "readme"])),
  }),
});

export type GsdPPConfigExtension = z.infer<typeof GsdPPConfigExtensionSchema>;

export const GsdPPManifestSchema = z.object({
  gsdpp_version: z.string(),
  gsd_version: z.string(),
  installed_at: z.string().datetime(),
  files: z.record(z.string(), z.string()),
});

export type GsdPPManifest = z.infer<typeof GsdPPManifestSchema>;

export interface GsdDetectionResult {
  found: boolean;
  version: string;
  claudeDir: string;
  gsdDir: string;
}
