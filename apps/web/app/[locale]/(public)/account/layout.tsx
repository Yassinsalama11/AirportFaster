/**
 * Account section layout — shared wrapper for all /account/* pages.
 * Individual protected pages redirect to /account/login when not authenticated.
 * Login and register are open routes within this segment.
 */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
