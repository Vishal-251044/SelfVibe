import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  FiHeadphones,
  FiZap,
  FiSearch,
  FiCpu,
  FiMonitor,
  FiGlobe,
} from "react-icons/fi";
import {
  FiCoffee,
  FiMusic,
  FiTarget,
  FiActivity,
  FiMoon,
  FiCode,
  FiMap,
  FiSmile,
} from "react-icons/fi";
import {
  FiHeart,
  FiClock,
  FiPlay,
  FiDownload,
  FiX,
  FiCheck,
} from "react-icons/fi";


export default function Home() {
  return (
    <>
      <Navbar />

      {/* Home Section */}
      <section
        id="home"
        className="relative min-h-screen pt-10 pb-0 flex items-center justify-center bg-black text-white font-mono overflow-hidden"
      >
        {/* Square Grid Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
        linear-gradient(rgba(34,197,94,0.50) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34,197,94,0.50) 1px, transparent 1px)
      `,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="absolute inset-0 bg-black/80" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">

          <div className="inline-flex items-center gap-2 px-5 py-2 mb-8 rounded-full border border-green-500/60 text-green-400 text-sm shadow-[0_0_20px_rgba(34,197,94,0.6)]">
            <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
            Now streaming worldwide
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            <span className="block text-white">Stream music.</span>
            <span
              className="block font-bold tracking-wide"
              style={{ color: "#6BFF6B", textShadow: "0 0 5px rgba(107,255,107,0.8), 0 0 5px rgba(107,255,107,0.5)", }}
            >
              Feel the magic.
            </span>
          </h1>

          <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-16">
            A next-generation music platform for listeners and creators.
            Built with a terminal-inspired interface and always-on streams.
          </p>

          <div className="mx-auto max-w-4xl bg-black border border-green-500/50 rounded-xl p-6 shadow-[0_0_50px_rgba(34,197,94,0.4)] mb-16">

            <div className="flex items-center gap-2 mb-5">
              <span className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="w-3 h-3 bg-yellow-400 rounded-full" />
              <span className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="ml-4 text-gray-500 text-sm">soundcode@terminal:~</span>
            </div>

            <p className="text-green-400 mb-2">$ soundcode play --genre electronic</p>

            <p className="text-gray-300">
              <span className="text-green-400">{">>"}</span> Now playing:{" "}
              <span className="text-white font-semibold">Midnight Algorithm</span>
            </p>

            <p className="text-gray-300 mb-6">
              <span className="text-green-400">{">>"}</span> Artist:{" "}
              <span className="text-white font-semibold">Vishal Chavan</span>
            </p>

            {/* Progress */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex-1 h-1.5 bg-gray-800 rounded">
                <div className="h-1.5 w-1/3 bg-green-500 rounded shadow-[0_0_12px_rgba(34,197,94,1)]" />
              </div>
              1:24 / 4:12
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative min-h-screen pt-28 pb-0 bg-black text-white font-mono overflow-hidden"
      >
        {/* Square Grid Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
        linear-gradient(rgba(34,197,94,0.18) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34,197,94,0.18) 1px, transparent 1px)
      `,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="absolute inset-0 bg-black/90" />

        <div className="relative z-10 max-w-7xl mx-auto px-6">

          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for the modern listener
            </h2>
            <p className="text-gray-400">
              Every feature designed with precision. Every experience crafted with care.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {[
              {
                id: "01",
                title: "High Quality Audio",
                desc:
                  "Stream music in lossless quality with crystal-clear sound that rivals vinyl.",
                icon: FiHeadphones,
              },
              {
                id: "02",
                title: "Lightning Fast",
                desc:
                  "Instant playback with zero buffering. Start listening in milliseconds.",
                icon: FiZap,
              },
              {
                id: "03",
                title: "Smart Search",
                desc:
                  "Find any track, artist, or genre with our intelligent search algorithm.",
                icon: FiSearch,
              },
              {
                id: "04",
                title: "Personalized Feeds",
                desc: "Discover new music tailored to your taste. Generate your own music using AI or upload your self-created tracks.",
                icon: FiCpu,
              },
              {
                id: "05",
                title: "Cross Platform",
                desc:
                  "Seamless listening across desktop, mobile, and web platforms.",
                icon: FiMonitor,
              },
              {
                id: "06",
                title: "Always Online",
                desc:
                  "24/7 global streaming with reliable uptime and performance.",
                icon: FiGlobe,
              },
            ].map(({ id, title, desc, icon: Icon }) => (
              <div
                key={id}
                className="relative border border-green-500/30 rounded-xl p-8 bg-black/70"
              >
                {/* Feature Number */}
                <span className="absolute top-6 right-6 text-gray-500 text-sm">
                  [{id}]
                </span>

                {/* Icon Box */}
                <div className="w-12 h-12 flex items-center justify-center rounded-lg mb-6
            border border-green-500/40 text-green-400">
                  <Icon size={22} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-3">
                  {title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed text-sm">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse Section */}
      <section
        id="browse"
        className="relative min-h-screen pt-28 pb-0 bg-black text-white font-mono overflow-hidden"
      >
        {/* Square Grid Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
        linear-gradient(rgba(34,197,94,0.25) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34,197,94,0.25) 1px, transparent 1px)
      `,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="absolute inset-0 bg-black/85" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">

          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">Browse by</span>{" "}
              <span
                style={{
                  color: "#6BFF6B",
                  textShadow:
                    "0 0 2px rgba(107,255,107,0.9), 0 0 6px rgba(107,255,107,0.6)",
                }}
              >
                Mood
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Pick a vibe. Let the music match your moment.
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: "Chill", icon: FiCoffee },
              { name: "Party", icon: FiMusic },
              { name: "Focus", icon: FiTarget },
              { name: "Workout", icon: FiActivity },
              { name: "Late Night", icon: FiMoon },
              { name: "Coding Mode", icon: FiCode },
              { name: "Travel", icon: FiMap },
              { name: "Relax", icon: FiSmile },
            ].map(({ name, icon: Icon }) => (
              <div
                key={name}
                className="relative group cursor-pointer rounded-xl
      border border-green-500/40 bg-black/60 p-8
      transition-all duration-300 hover:border-green-400"
              >
                {/* Hover Glow */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0
        group-hover:opacity-100 transition
        shadow-[0_0_35px_rgba(34,197,94,0.35)]"
                />

                <div className="relative z-10 flex flex-col items-center text-center gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 flex items-center justify-center
          rounded-lg border border-green-500/40 text-green-400">
                    <Icon size={22} />
                  </div>

                  {/* Mood Text */}
                  <p
                    className="text-xl md:text-2xl font-bold"
                    style={{
                      color: "#6BFF6B",
                    }}
                  >
                    {name}
                  </p>

                  <p className="text-gray-400 text-sm">
                    Vibe-based streaming
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="relative min-h-screen pt-28 pb-24 bg-black text-white font-mono overflow-hidden"
      >
        {/* Grid Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
        linear-gradient(rgba(34,197,94,0.22) 1px, transparent 1px),
        linear-gradient(90deg, rgba(34,197,94,0.22) 1px, transparent 1px)
      `,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 bg-black/85" />

        <div className="relative z-10 max-w-6xl mx-auto px-6">

          {/* Heading */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">Simple</span>{" "}
              <span
                style={{
                  color: "#6BFF6B",
                  textShadow:
                    "0 0 2px rgba(107,255,107,0.9), 0 0 6px rgba(107,255,107,0.6)",
                }}
              >
                Pricing
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Choose the plan that fits your vibe. Upgrade anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-10">

            {/* FREE PLAN */}
            <div className="relative rounded-xl border border-green-500/40 bg-black/60 p-10">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <p className="text-gray-400 mb-6">For everyday listening</p>

              <div className="text-4xl font-bold mb-8">
                ₹0 <span className="text-gray-400 text-lg">/ month</span>
              </div>

              <ul className="space-y-4 text-gray-300">
                <li className="flex items-center gap-3">
                  <FiMusic className="text-green-400" /> Listen to music
                </li>
                <li className="flex items-center gap-3">
                  <FiHeart className="text-green-400" /> Category-based favorites
                </li>
                <li className="flex items-center gap-3">
                  <FiClock className="text-green-400" /> Time-based playlists
                </li>
                <li className="flex items-center gap-3">
                  <FiPlay className="text-green-400" /> Stream online
                </li>

                <li className="flex items-center gap-3 text-gray-500">
                  <FiX /> Self music creation with AI
                </li>
                <li className="flex items-center gap-3 text-gray-500">
                  <FiX /> Download songs
                </li>
                <li className="flex items-center gap-3 text-gray-500">
                  <FiX /> Ad-free experience
                </li>
              </ul>
            </div>

            {/* PRO PLAN */}
            <div className="relative rounded-xl border border-green-400 bg-black/70 p-10
        shadow-[0_0_40px_rgba(34,197,94,0.35)]">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <p className="text-gray-400 mb-6">For creators & power listeners</p>

              <div className="text-4xl font-bold mb-8">
                ₹99 <span className="text-gray-400 text-lg">/ month</span>
              </div>

              <ul className="space-y-4 text-gray-300">
                <li className="flex items-center gap-3">
                  <FiCheck className="text-green-400" /> Everything in Free
                </li>
                <li className="flex items-center gap-3">
                  <FiZap className="text-green-400" /> Self music creation with AI
                </li>
                <li className="flex items-center gap-3">
                  <FiDownload className="text-green-400" /> Download music
                </li>
                <li className="flex items-center gap-3">
                  <FiMusic className="text-green-400" /> Upload & publish on platform
                </li>
                <li className="flex items-center gap-3">
                  <FiCheck className="text-green-400" /> No ads
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
