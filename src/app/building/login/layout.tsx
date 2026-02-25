// Building login page doesn't need the building layout
export default function BuildingLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
