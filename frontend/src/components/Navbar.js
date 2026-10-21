"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiMenu, FiX } from "react-icons/fi";
import { FaMicrophone } from "react-icons/fa";

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const toggleMenu = () => setIsOpen(!isOpen);
    const menuItems = ["Home", "Features", "Browse", "Pricing"];

    return (
        <nav className="bg-black text-white sticky top-0 z-50 border-b border-green-800/30 shadow-md shadow-green-900/20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex justify-between h-20 items-center">

                    {/* Logo */}
                    <div className="flex items-center gap-2 md:gap-3 cursor-pointer"
                        onClick={() => router.push("/")}
                    >
                        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl border border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                            <FaMicrophone className="text-green-500 text-lg md:text-xl" />
                        </div>

                        <span
                            className="text-xl md:text-2xl font-mono font-bold tracking-wide text-green-200"
                            style={{
                                textShadow:
                                    "0 0 8px rgba(34,197,94,0.8), 0 0 16px rgba(34,197,94,0.5)",
                            }}
                        >
                            SelfVibe
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-10 font-mono text-gray-400">
                        {menuItems.map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="hover:text-green-400 transition"
                            >
                                {item}
                            </a>
                        ))}
                    </div>

                    {/* Desktop Get Started */}
                    <div
                        onClick={() => router.push("/login")}
                        className="hidden md:block font-mono font-semibold text-green-100 bg-green-500/50 px-4 py-1.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-green-500 hover:text-black hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                    >
                        Get Started
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button onClick={toggleMenu}>
                            {isOpen ? (
                                <FiX size={26} className="text-green-500" />
                            ) : (
                                <FiMenu size={26} className="text-green-500" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-black border-t border-green-500/20 px-6 py-4 flex flex-col items-center text-center space-y-3 animate-slide-down font-mono text-gray-300">
                    {menuItems.map((item) => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className="hover:text-green-400 transition"
                            onClick={() => setIsOpen(false)}
                        >
                            {item}
                        </a>
                    ))}

                    <button
                        onClick={() => {
                            setIsOpen(false);
                            router.push("/login");
                        }}
                        className="font-mono font-semibold text-green-100 bg-green-500/50 px-4 py-1.5 rounded-lg transition-all duration-200 active:bg-green-500 active:text-black focus:bg-green-500 focus:text-black focus:shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                    >
                        Get Started
                    </button>
                </div>
            )}
        </nav>
    );
}
