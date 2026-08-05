import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface FAQ {
    question: string;
    answer: string;
}

const faqs: FAQ[] = [
    {
        question: "Is there a free trial?",
        answer: "Yes! Our Starter plan is completely free — with unlimited rooms, 20 bookings per month, and a basic booking page. No credit card required. Upgrade anytime as you grow."
    },
    {
        question: "Is there a setup fee?",
        answer: "No. All onboarding, initial data migration, and training are included in your subscription. We believe your success is our success."
    },
    {
        question: "Do you integrate with OTAs?",
        answer: "Yes, our Pro and Enterprise plans include seamless two-way synchronization with all major OTAs (MakeMyTrip, Goibibo, Booking.com, Agoda) via our channel manager."
    },
    {
        question: "Can I manage my hotel restaurant too?",
        answer: "Absolutely. Our Pro plan includes a full restaurant POS — menu management, food orders with kitchen tracking, table management, and inventory control. All integrated with your hotel operations."
    },
    {
        question: "Can I manage multiple properties?",
        answer: "Yes. The Enterprise plan includes a multi-property dashboard where you can manage all your hotels from a single login, with per-property staff roles and unified analytics."
    },
    {
        question: "What happens after Year 1?",
        answer: "Your subscription locks in your pricing for 12 months. After Year 1, you can renew at the same rate, ensuring predictable, transparent operational costs."
    }
];

export default function FAQAccordion() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
                <div
                    key={index}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                    <button
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        className="w-full text-left px-6 py-6 flex items-center justify-between focus:outline-none"
                    >
                        <span className="font-serif text-xl font-bold text-[#0E2A38]">{faq.question}</span>
                        <motion.div
                            animate={{ rotate: openIndex === index ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-[#C9A646]"
                        >
                            <ChevronDown size={20} />
                        </motion.div>
                    </button>

                    <AnimatePresence>
                        {openIndex === index && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                <div className="px-6 pb-6 text-gray-600 leading-relaxed font-medium">
                                    {faq.answer}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
}
