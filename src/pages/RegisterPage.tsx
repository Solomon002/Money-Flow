import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { registerUser, getGoogleSignInUrl } from "../api/auth.js";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRequirements = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "One uppercase letter",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "One lowercase letter",
      valid: /[a-z]/.test(password),
    },
    {
      label: "One number",
      valid: /[0-9]/.test(password),
    },
    {
      label: "One special character",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const isPasswordValid = passwordRequirements.every(
    (requirement) => requirement.valid,
  );

  function handleGoogleSignIn() {
    window.location.href = getGoogleSignInUrl();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <Link
              to="/"
              className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              ← Back to MoneyFlow
            </Link>

            <p className="text-sm font-semibold text-slate-500">MoneyFlow</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Create your account
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Start understanding and managing your money.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M21.35 12.23c0-.79-.07-1.55-.22-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
              />
              <path
                fill="#34A853"
                d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.5Z"
              />
              <path
                fill="#FBBC05"
                d="M6.54 13.6a5.86 5.86 0 0 1 0-3.74V7.33H3.3a9.5 9.5 0 0 0 0 8.8l3.24-2.53Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.83c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 2.93 14.63 2 12 2a9.75 9.75 0 0 0-8.7 5.33l3.24 2.53C7.31 7.55 9.46 5.83 12 5.83Z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />

            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              or
            </span>

            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form
            onSubmit={async (event) => {
              event.preventDefault();

              setErrorMessage("");

              if (!isPasswordValid) {
                setErrorMessage("Password does not meet all the requirements");
                return;
              }

              if (password !== confirmPassword) {
                setErrorMessage("Passwords do not match");
                return;
              }

              setIsSubmitting(true);

              try {
                const result = await registerUser({
                  name: name.trim(),
                  email: email.trim(),
                  password,
                });

                if (!result.response.ok) {
                  throw new Error(
                    result.data.message || "Unable to create account",
                  );
                }

                navigate("/login", {
                  state: {
                    registrationSuccess:
                      "Account created successfully. Please sign in.",
                    email: email.trim(),
                  },
                });
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to create account",
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">
                  Use a strong password with:
                </p>

                <ul className="space-y-1.5">
                  {passwordRequirements.map((requirement) => (
                    <li
                      key={requirement.label}
                      className={`flex items-center gap-2 text-xs ${
                        requirement.valid
                          ? "text-emerald-600"
                          : "text-slate-500"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                          requirement.valid ? "bg-emerald-100" : "bg-slate-200"
                        }`}
                      >
                        {requirement.valid ? "✓" : "•"}
                      </span>

                      {requirement.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your password again"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-slate-900 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
