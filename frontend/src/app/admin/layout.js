/**
 * Owner / Admin Console root (/admin/*). Private: not linked from the public
 * site and hidden from search engines (PRD ADL-1).
 */
export const metadata = {
  title: { default: "Console", template: "%s · SelfVibe Console" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }) {
  return children;
}
