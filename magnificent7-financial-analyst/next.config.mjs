/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for neo4j-driver (uses Node.js built-ins)
  serverExternalPackages: ["neo4j-driver"],
};

export default nextConfig;
