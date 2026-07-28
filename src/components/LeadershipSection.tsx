"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ArrowRight } from "lucide-react";
import { SectionSubheader } from "@/components/SectionHeader";
import { staffingData } from "@/data/siteData";

export interface BioSection {
  heading: string;
  text: string;
}

export interface Person {
  name: string;
  title: string;
  image?: string;
  bio?: string | BioSection[];
}

/** True when a person has any bio content worth showing in the modal. */
function hasBio(person: Person): boolean {
  if (!person.bio) return false;
  if (Array.isArray(person.bio)) {
    return person.bio.some((b) => (b.text ?? "").trim() || (b.heading ?? "").trim());
  }
  return person.bio.trim().length > 0;
}

/** True for placeholder cards representing an unfilled position. */
function isVacant(person: Person): boolean {
  return person.name.trim().toLowerCase() === "vacant";
}

function PersonPhoto({ image, blank }: { image?: string; blank?: boolean }) {
  // Vacant positions: a plain empty circle (no logo) so the card reads as "open".
  if (blank) {
    return <div className="w-24 h-24 mb-3 rounded-full bg-gray-100 flex-shrink-0" />;
  }
  return (
    <div className="relative w-24 h-24 mb-3 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ring-2 ring-transparent group-hover:ring-[#21355a]/20 transition-all">
      {image ? (
        <Image src={image} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        <Image src="/fpa_logo.png" alt="" fill sizes="96px" className="object-contain p-2" />
      )}
    </div>
  );
}

const CARD_BASE =
  "group relative bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center transition-all duration-200";

// Vacant cards: same shell but no `group`/hover/transition, so nothing reacts
// to the cursor.
const VACANT_CARD_BASE =
  "relative bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col items-center text-center";

function PersonCard({ person, onOpen }: { person: Person; onOpen?: () => void }) {
  const vacant = isVacant(person);
  // Vacant positions (or anyone with no bio) render a non-interactive card
  // with no "Read bio" and no empty modal. Vacant cards also drop every hover
  // affordance and show a blank circle instead of the logo.
  if (vacant || !onOpen) {
    return (
      <div className={vacant ? VACANT_CARD_BASE : CARD_BASE}>
        <PersonPhoto image={person.image} blank={vacant} />
        <p className="font-semibold text-[#21355a] leading-tight">{person.name}</p>
        <p className="text-sm text-gray-600 mt-1 leading-snug">{person.title}</p>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`View bio for ${person.name}`}
      className={`${CARD_BASE} hover:-translate-y-1 hover:shadow-lg hover:border-[#21355a]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#21355a] focus-visible:ring-offset-2`}
    >
      <PersonPhoto image={person.image} />
      <p className="font-semibold text-[#21355a] leading-tight">{person.name}</p>
      <p className="text-sm text-gray-600 mt-1 leading-snug">{person.title}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#21355a]/70 group-hover:text-[#21355a] transition-colors">
        Read bio
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </button>
  );
}

function BioModal({ person, onClose }: { person: Person; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bio-modal-name"
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]"
    >
      <button
        type="button"
        aria-label="Close bio"
        onClick={onClose}
        className="absolute inset-0 bg-[#0b1626]/70 backdrop-blur-sm"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-[scaleIn_180ms_cubic-bezier(0.16,1,0.3,1)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-[#21355a] shadow-sm transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="bg-gradient-to-br from-[#21355a] to-[#2c4470] h-24" aria-hidden="true" />
        <div className="px-6 -mt-16">
          <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden bg-white ring-4 ring-white shadow-lg">
            {person.image ? (
              <Image src={person.image} alt="" fill sizes="128px" className="object-cover" />
            ) : (
              <Image src="/fpa_logo.png" alt="" fill sizes="128px" className="object-contain bg-gray-50" />
            )}
          </div>
          <h3 id="bio-modal-name" className="mt-4 text-xl font-bold text-[#21355a] text-center">
            {person.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-gray-600 text-center">{person.title}</p>
        </div>
        <div className="px-6 pb-6 mt-5 pt-5 border-t border-gray-100 overflow-y-auto max-h-[45vh]">
          {Array.isArray(person.bio) ? (
            <div className="space-y-4">
              {person.bio.map((section) => (
                <div key={section.heading}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#21355a] mb-1">
                    {section.heading}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{section.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">
              {person.bio ?? "Bio pending."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeadershipSection({ leaders }: { leaders?: Person[] }) {
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  // Fall back to the curated list if the CMS passes nothing.
  const people = leaders && leaders.length > 0 ? leaders : staffingData.leadership;

  return (
    <section>
      <SectionSubheader title="Leadership" />
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {people.map((leader) => (
          <PersonCard
            key={`${leader.name}-${leader.title}`}
            person={leader}
            onOpen={hasBio(leader) ? () => setActivePerson(leader) : undefined}
          />
        ))}
      </div>
      {activePerson && (
        <BioModal person={activePerson} onClose={() => setActivePerson(null)} />
      )}
    </section>
  );
}
