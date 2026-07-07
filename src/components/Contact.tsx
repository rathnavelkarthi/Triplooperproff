import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useCRM } from '../context/CRMDataContext';
import { toast } from 'sonner';

export default function Contact() {
  const { cmsSettings } = useCRM();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      toast.error('Please fill in your name and message.');
      return;
    }
    setSending(true);
    // Build WhatsApp message as a fallback contact method
    const phone = cmsSettings.contactPhone?.replace(/[\s\(\)\-]/g, '') || '';
    const text = `Hi, I'm ${form.name}.${form.phone ? ` My phone: ${form.phone}.` : ''} ${form.message}`;
    const waUrl = `https://wa.me/${phone.startsWith('+') ? phone.slice(1) : phone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    setSending(false);
    toast.success('Redirecting you to WhatsApp to send your enquiry.');
    setForm({ name: '', phone: '', message: '' });
  };

  return (
    <section id="contact" className="py-32 md:py-48 bg-background relative selection:bg-accent/30">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-32">

          {/* Left: Minimal Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center"
          >
            <span className="text-[11px] tracking-[0.25em] text-foreground/50 uppercase mb-8 block font-medium">
              Inquiries & Reservations
            </span>
            <h2 className="font-serif text-5xl lg:text-[64px] leading-tight text-foreground mb-12">
              Get in Touch
            </h2>
            <p className="text-foreground/70 text-lg font-light leading-relaxed mb-16 max-w-md">
              We invite you to reach out for personalized assistance regarding your upcoming coastal escape.
            </p>

            <div className="space-y-12">
              <div>
                <h4 className="text-[10px] tracking-[0.2em] uppercase text-foreground/40 mb-3 block font-semibold">Location</h4>
                <p className="font-light text-foreground/80 leading-relaxed text-lg">
                  {cmsSettings.contactAddress.split('\n').map((line: string, i: number) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] tracking-[0.2em] uppercase text-foreground/40 mb-3 block font-semibold">Contact</h4>
                <p className="font-light text-foreground/80 leading-relaxed text-lg mb-2">
                  <a href={`tel:${cmsSettings.contactPhone.replace(/[\s\(\)-]/g, '')}`} className="hover:text-accent transition-colors block">
                    {cmsSettings.contactPhone}
                  </a>
                </p>
                <p className="font-light text-foreground/80 leading-relaxed text-lg">
                  <a href={`mailto:${cmsSettings.contactEmail}`} className="hover:text-accent transition-colors block">
                    {cmsSettings.contactEmail}
                  </a>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: Floating Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="bg-white p-10 md:p-16 rounded-sm shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] border border-muted/50">
              <h3 className="font-serif text-3xl text-foreground mb-12">Send an Enquiry</h3>
              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="relative border-b border-foreground/10 pb-2">
                  <label htmlFor="contact-name" className="block text-[10px] font-semibold uppercase tracking-widest text-foreground/40 mb-3">Name</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-transparent outline-none text-foreground font-light text-lg transition-colors focus:border-accent border-b border-transparent pb-1"
                  />
                </div>

                <div className="relative border-b border-foreground/10 pb-2">
                  <label htmlFor="contact-phone" className="block text-[10px] font-semibold uppercase tracking-widest text-foreground/40 mb-3">Phone</label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-transparent outline-none text-foreground font-light text-lg transition-colors focus:border-accent border-b border-transparent pb-1"
                  />
                </div>

                <div className="relative border-b border-foreground/10 pb-2">
                  <label htmlFor="contact-message" className="block text-[10px] font-semibold uppercase tracking-widest text-foreground/40 mb-3">Message</label>
                  <textarea
                    id="contact-message"
                    rows={3}
                    required
                    value={form.message}
                    onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-transparent outline-none text-foreground font-light text-lg transition-colors focus:border-accent border-b border-transparent pb-1 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-foreground text-background py-5 uppercase tracking-widest text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-all duration-500 mt-6 shadow-md rounded-sm disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
