import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';
const config: NextConfig = { serverExternalPackages: ['workflow'] };
export default withWorkflow(config);
