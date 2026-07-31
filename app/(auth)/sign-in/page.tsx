import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string; error?: string }>;
}) {
  const { callbackURL, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignInForm callbackURL={callbackURL ?? "/"} error={error} />
    </div>
  );
}
