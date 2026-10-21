"use client";

import { FaMicrophone, FaInstagram, FaLinkedin, FaGithub, FaTwitter } from "react-icons/fa";

export default function Footer() {
    return (
        <footer className="bg-black border-t border-green-800/30 shadow-[0_-5px_20px_rgba(34,197,94,0.15)]">
            <div className="max-w-7xl mx-auto px-6 py-12">

                {/* Top Section */}
                <div className="grid md:grid-cols-3 gap-10 text-center md:text-left">

                    {/* Logo + About */}
                    <div className="flex flex-col items-center md:items-start gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl border border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                                <FaMicrophone className="text-green-500 text-xl" />
                            </div>

                            <span
                                className="text-2xl font-mono font-bold tracking-wide text-green-200"
                                style={{
                                    textShadow:
                                        "0 0 8px rgba(34,197,94,0.8), 0 0 16px rgba(34,197,94,0.5)",
                                }}
                            >
                                SelfVibe
                            </span>
                        </div>

                        <p className="font-mono text-gray-400 text-sm leading-relaxed max-w-sm">
                            SelfVibe helps you amplify your voice and confidence.
                            Create, explore, and grow with AI-powered audio experiences
                            built for the future.
                        </p>
                    </div>

                    {/* Contact Info */}
                    <div className="font-mono text-gray-400">
                        <h3 className="text-green-300 font-semibold mb-4">Contact</h3>
                        <p>Email: support@selfvibe.ai</p>
                        <p>Phone: +91 99999 99999</p>
                        <p>Location: India</p>
                    </div>

                    {/* Social Media */}
                    <div className="font-mono">
                        <h3 className="text-green-300 font-semibold mb-4">Follow Us</h3>
                        <div className="flex justify-center md:justify-start gap-6 text-green-400 text-xl">
                            <a href="#" className="hover:text-green-300 transition">
                                <FaInstagram />
                            </a>
                            <a href="#" className="hover:text-green-300 transition">
                                <FaLinkedin />
                            </a>
                            <a href="#" className="hover:text-green-300 transition">
                                <FaGithub />
                            </a>
                            <a href="#" className="hover:text-green-300 transition">
                                <FaTwitter />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-green-800/20 my-8"></div>

                {/* Bottom */}
                <div className="text-center font-mono text-gray-500 text-sm">
                    © {new Date().getFullYear()} SelfVibe. All rights reserved.
                </div>

            </div>
        </footer>
    );
}
