"use client";

import { useState } from "react";
import SectionHeader from "@/components/SectionHeader";

const TOPICS = [
  "Levees / Floodgates",
  "Turf maintenance",
  "Lakefront flooding",
  "Media inquiry",
  "Other",
] as const;

type Status = "idle" | "submitting" | "success" | "error";

export default function FeedbackPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
    const company = (
      form.elements.namedItem("company") as HTMLInputElement
    ).value;

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message, company }),
      });

      if (res.ok || res.status === 204) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Send Feedback" />
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-green-800">
              Thanks. Your message has been sent to the Flood Authority.
              We&apos;ll follow up if a response is needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Send Feedback"
          subtitle="Have a question or comment for the Flood Authority? Send us a note below."
        />

        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
          For street flooding, drainage, water service, or sewage issues,
          contact the Sewerage &amp; Water Board of New Orleans at{" "}
          <a
            href="https://www.swbno.org"
            className="text-[#21355a] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            swbno.org
          </a>
          .
        </div>

        {status === "error" && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Something went wrong. Please try again, or{" "}
            <a
              href="https://www.floodauthority.org/about-us/contact-us/"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              contact the Flood Authority directly
            </a>
            .
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot — hidden from humans, filled by bots */}
          <input
            type="text"
            name="company"
            defaultValue=""
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ display: "none" }}
          />

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21355a] focus:border-[#21355a]"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21355a] focus:border-[#21355a]"
            />
          </div>

          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Topic <span className="text-red-500">*</span>
            </label>
            <select
              id="topic"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21355a] focus:border-[#21355a] bg-white"
            >
              <option value="" disabled>
                Select one
              </option>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              required
              minLength={10}
              maxLength={5000}
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21355a] focus:border-[#21355a] resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="bg-[#21355a] text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-[#1a2847] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === "submitting" ? "Sending..." : "Send feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}
