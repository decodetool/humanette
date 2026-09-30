import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

const config: NextConfig = {
  transpilePackages: ['humanette'],
  devIndicators: false,
  // Allow Next's advertised LAN URL to hydrate, without trusting arbitrary origins.
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap((addresses) =>
    (addresses ?? [])
      .filter((address) => address.family === 'IPv4' && !address.internal)
      .map((address) => address.address),
  ),
};
export default config;
