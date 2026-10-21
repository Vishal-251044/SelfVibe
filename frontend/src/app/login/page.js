"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  return (
    <div className="min-h-screen bg-black flex justify-center px-2 py-16 sm:py-5">
      <div className="w-full max-w-md bg-black/80 border border-green-500/30 rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.25)] p-6 sm:p-8 font-mono transition-all duration-300">

        {/* Header */}
        <h1 className="text-2xl sm:text-3xl text-white font-bold text-center">
          {isSignup ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-gray-400 text-sm text-center mt-1">
          {isSignup
            ? "Sign up to start your journey"
            : "Enter your credentials to access your account"}
        </p>

        {/* Form */}
        <form className="mt-6 space-y-4">

          {/* Name (Signup only) */}
          {isSignup && (
            <div>
              <label className="text-sm text-gray-300">Name</label>
              <div className="mt-1 flex items-center gap-2 bg-black border border-green-500/30 rounded-lg px-3 py-2 focus-within:border-green-400">
                <User size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full bg-transparent outline-none text-white placeholder-gray-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-sm text-gray-300">Email</label>
            <div className="mt-1 flex items-center gap-2 bg-black border border-green-500/30 rounded-lg px-3 py-2 focus-within:border-green-400">
              <Mail size={18} className="text-gray-400" />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full bg-transparent outline-none text-white placeholder-gray-500 text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-300">Password</label>
            <div className="mt-1 flex items-center gap-2 bg-black border border-green-500/30 rounded-lg px-3 py-2 focus-within:border-green-400">
              <Lock size={18} className="text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full bg-transparent outline-none text-white placeholder-gray-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-green-400"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full mt-2 bg-green-500 text-black font-semibold py-2 rounded-lg hover:bg-green-400 transition shadow-[0_0_20px_rgba(34,197,94,0.6)]"
          >
            {isSignup ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-green-500/20"></div>
          <span className="text-xs text-gray-400">or continue with</span>
          <div className="flex-1 h-px bg-green-500/20"></div>
        </div>

        {/* Google */}
        <button className="w-full border border-green-500/30 text-white py-2 rounded-lg hover:border-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition">
          Google
        </button>

        {/* Toggle Login / Signup */}
        <p className="text-center text-sm text-gray-400 mt-5">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <span
                onClick={() => setIsSignup(false)}
                className="text-green-400 cursor-pointer hover:underline"
              >
                Sign in
              </span>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <span
                onClick={() => setIsSignup(true)}
                className="text-green-400 cursor-pointer hover:underline"
              >
                Sign up
              </span>
            </>
          )}
        </p>

        {/* Back to home */}
        <p
          onClick={() => router.push("/")}
          className="text-center text-xs text-gray-500 mt-6 cursor-pointer hover:text-green-400"
        >
          Back to home
        </p>
      </div>
    </div>
  );
}
