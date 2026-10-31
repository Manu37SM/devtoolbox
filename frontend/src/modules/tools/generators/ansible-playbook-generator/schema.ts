import { z } from "zod";

export const ansiblePlaybookGeneratorOptionsSchema = z.object({
  playName: z.string().default("Configure servers"),
  hosts: z.string().default("all"),
  become: z.boolean().default(true),
  gatherFacts: z.boolean().default(true),
  packageModule: z.enum(["package", "apt", "dnf", "yum"]).default("package"),
  /** apt only: run apt-get update first (cache valid for an hour) */
  updateCache: z.boolean().default(true),
  /** ansible.builtin.copy instead of copy */
  fqcn: z.boolean().default(true),
  /** Tag every task with its verb (package, service, copy…) */
  autoTags: z.boolean().default(false),
  vars: z.string().default(""),
  /** Name every task from its parameters (otherwise a generic name per verb) */
  describeTasks: z.boolean().default(true),
});
export type AnsiblePlaybookGeneratorOptions = z.infer<typeof ansiblePlaybookGeneratorOptionsSchema>;
