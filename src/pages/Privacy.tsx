import { useEffect } from "react";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy | OdungaMarket";
  }, []);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <h2 className="text-xl font-semibold">1. Information We Collect</h2>
        <p>We collect: (a) account info (name, email, phone, business name, country); (b) transaction data (orders, payouts, bank details for verified producers); (c) communications (support tickets, direct messages); (d) usage data (logins, last-seen timestamps, device/IP for security).</p>

        <h2 className="text-xl font-semibold">2. How We Use Your Data</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Operate the marketplace and process orders</li>
          <li>Send transactional emails (receipts, payout notices, withdrawal updates)</li>
          <li>Calculate and pay commissions and referrer rewards</li>
          <li>Detect fraud, abuse, and policy violations</li>
          <li>Comply with legal and tax obligations</li>
        </ul>

        <h2 className="text-xl font-semibold">3. Sharing</h2>
        <p>We share data only with: Paystack (payments), Resend (email delivery), Google (AI features), Supabase (hosting/database), and law enforcement when legally required. We never sell your personal data.</p>

        <h2 className="text-xl font-semibold">4. Direct Messages and Admin Visibility</h2>
        <p>Direct messages between Producers and Wholesalers are visible to OdungaMarket administrators for moderation, dispute resolution, and policy enforcement.</p>

        <h2 className="text-xl font-semibold">5. Data Retention</h2>
        <p>We retain account and transaction records for at least 7 years to satisfy accounting and tax requirements. You may request export or deletion of personal data via your profile or support@odungamarket.com.</p>

        <h2 className="text-xl font-semibold">6. Your Rights</h2>
        <p>You have the right to access, correct, export (GDPR-style export available in your profile), or delete your data, subject to legal retention requirements.</p>

        <h2 className="text-xl font-semibold">7. Security</h2>
        <p>We use industry-standard measures: row-level security on the database, encrypted storage, HTTPS everywhere, and leaked-password protection on signup.</p>

        <h2 className="text-xl font-semibold">8. Cookies</h2>
        <p>We use essential cookies for authentication, currency preference, and cart persistence. We do not use third-party advertising cookies.</p>

        <h2 className="text-xl font-semibold">9. International Transfers</h2>
        <p>Data may be processed outside Kenya by our infrastructure providers. We take reasonable steps to ensure equivalent protection.</p>

        <h2 className="text-xl font-semibold">10. Children</h2>
        <p>OdungaMarket is not directed to anyone under 18.</p>

        <h2 className="text-xl font-semibold">11. Changes</h2>
        <p>We will notify users of material changes by email or in-app notification.</p>

        <h2 className="text-xl font-semibold">12. Contact</h2>
        <p>Privacy questions: privacy@odungamarket.com</p>
      </section>
    </main>
  );
}
