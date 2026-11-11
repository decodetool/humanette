// Set this to the domain connected to the website when deploying.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bigcursor.dev').replace(
  /\/+$/,
  '',
);
