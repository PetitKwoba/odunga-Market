import { useEffect } from "react";

export default function Terms() {
  useEffect(() => {
    document.title = "Terms of Service | OdungaMarket";
  }, []);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
        <p>By accessing or using OdungaMarket ("Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>

        <h2 className="text-xl font-semibold">2. Eligibility</h2>
        <p>You must be at least 18 years old and legally capable of entering into binding contracts to use OdungaMarket. Producer and wholesaler accounts require a registered business.</p>

        <h2 className="text-xl font-semibold">3. Accounts and Roles</h2>
        <p>OdungaMarket supports Producer, Wholesaler, Referrer, Admin, and Support roles. You are responsible for keeping your credentials secure and for all activity under your account.</p>

        <h2 className="text-xl font-semibold">4. Marketplace Role</h2>
        <p>OdungaMarket facilitates B2B transactions between independent Producers and Wholesalers. We are not a party to any sale contract between users, except where we act as merchant of record for processing.</p>

        <h2 className="text-xl font-semibold">5. Payments and Fees</h2>
        <p>Payments are processed via Paystack. OdungaMarket charges a 5% platform commission on successful orders. Producers may set additional commission for referrers. Funds are held for a 7-day return window before becoming available for withdrawal.</p>

        <h2 className="text-xl font-semibold">6. Payouts and Withdrawals</h2>
        <p>Producer payouts run biweekly; referrer payouts run monthly. On-demand withdrawals are subject to minimum thresholds and bank verification. OdungaMarket may delay or reverse payouts in cases of fraud, chargebacks, or disputes.</p>

        <h2 className="text-xl font-semibold">7. Prohibited Conduct</h2>
        <p>You may not: (a) sell illegal, counterfeit, or restricted goods; (b) circumvent the Platform to avoid fees; (c) misuse referral codes; (d) attempt to access another account; (e) upload malicious content.</p>

        <h2 className="text-xl font-semibold">8. Content and Listings</h2>
        <p>You retain ownership of content you upload but grant OdungaMarket a worldwide, royalty-free license to display, distribute, and promote it on the Platform. You warrant that you have rights to all uploaded content.</p>

        <h2 className="text-xl font-semibold">9. Suspension and Termination</h2>
        <p>We may suspend or terminate accounts that violate these Terms, with or without notice. Outstanding balances are subject to our Refund Policy and applicable law.</p>

        <h2 className="text-xl font-semibold">10. Disclaimers</h2>
        <p>The Platform is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, accuracy of listings, or specific business outcomes.</p>

        <h2 className="text-xl font-semibold">11. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, OdungaMarket's total liability shall not exceed the fees paid to us in the 12 months preceding the claim.</p>

        <h2 className="text-xl font-semibold">12. Governing Law</h2>
        <p>These Terms are governed by the laws of the Republic of Kenya. Disputes shall be resolved in the courts of Nairobi.</p>

        <h2 className="text-xl font-semibold">13. Contact</h2>
        <p>Questions about these Terms? Email support@odungamarket.com.</p>
      </section>
    </main>
  );
}
