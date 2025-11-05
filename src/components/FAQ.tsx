"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is SEO-AOE?",
    answer: "SEO-AOE tracks how your brand appears across AI answer engines like ChatGPT, Google AI Overview, Perplexity, Gemini, Claude, and Grok. It shows your AI visibility—a critical metric that traditional SEO tools miss."
  },
  {
    question: "How does it work?",
    answer: "Enter your keyword, domain, and country. SEO-AOE queries 7+ AI platforms in real-time and shows your ranking position, competitors mentioned, and context snippets. Results in under 30 seconds."
  },
  {
    question: "Why track AI visibility?",
    answer: "Over 40% of searches now trigger AI-powered results. If competitors appear in AI answers but you don't, you're losing leads. SEO-AOE fills the gap traditional SEO tools can't measure."
  },
  {
    question: "Which platforms does it monitor?",
    answer: "Google AI Overview, Google Organic, ChatGPT, Perplexity, Grok, Gemini, and Claude. Supports 90+ countries with weighted scores based on each platform's market influence."
  },
  {
    question: "How much does it cost?",
    answer: "Basic checks are free—no account needed. Just enter your details and get instant results. Premium plans with historical tracking and automated reports available for regular monitoring."
  },
  {
    question: "Does it show competitor rankings?",
    answer: "Yes. See which competitors rank higher, their exact positions (1st, 2nd, 3rd), and how AI platforms describe them versus your brand. Helps identify gaps and opportunities."
  }
];

// Generate FAQ Schema for SEO
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Lazy load FAQ when it comes into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "100px" } // Start loading 100px before it comes into view
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <>
      {/* Schema Markup for SEO */}
      <Script id="faq-schema" type="application/ld+json">
        {JSON.stringify(faqSchema)}
      </Script>

      <section ref={sectionRef} className="w-full bg-black py-16 px-6">
        <div className="mx-auto max-w-3xl">
          {/* Section Header */}
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-neutral-400 text-base">
              Everything you need to know about AI visibility tracking and SEO-AOE
            </p>
          </div>

          {/* FAQ Items - Only render when visible */}
          {isVisible && (
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="faq-item rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden"
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both`
                  }}
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 group"
                    aria-expanded={openIndex === index}
                  >
                    <h3 className="text-lg font-semibold text-white group-hover:text-amber-500 faq-question-transition">
                      {faq.question}
                    </h3>
                    <svg
                      className={`h-5 w-5 flex-shrink-0 text-amber-500 faq-icon-transition ${
                        openIndex === index ? "faq-icon-open" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Progressive disclosure - answer loads on click */}
                  <div
                    className={`faq-answer ${openIndex === index ? "faq-answer-open" : "faq-answer-closed"}`}
                  >
                    <div className="px-6 pb-5">
                      <div className="pt-2 border-t border-neutral-800">
                        <p className="text-neutral-300 text-base leading-relaxed mt-3">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA after FAQs */}
          <div className="mt-12 text-center">
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 text-white font-semibold transition hover:bg-amber-600"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Check Visibility
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* CSS-based animations for better performance */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .faq-item {
          transition: border-color 0.2s ease;
        }

        .faq-item:hover {
          border-color: rgba(245, 158, 11, 0.5);
        }

        .faq-question-transition {
          transition: color 0.2s ease;
        }

        .faq-icon-transition {
          transition: transform 0.2s ease;
        }

        .faq-icon-open {
          transform: rotate(180deg);
        }

        .faq-answer {
          transition: max-height 0.3s ease, opacity 0.3s ease;
          overflow: hidden;
        }

        .faq-answer-closed {
          max-height: 0;
          opacity: 0;
        }

        .faq-answer-open {
          max-height: 500px;
          opacity: 1;
        }
      `}</style>
    </>
  );
}
