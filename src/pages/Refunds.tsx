import { useEffect } from "react";

export default function Refunds() {
  useEffect(() => {
    document.title = "Refund & Return Policy | OdungaMarket";
  }, []);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold mb-2">Refund & Return Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <section className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <h2 className="text-xl font-semibold">1. Return Window</h2>
        <p>Wholesalers may request a return within <strong>7 days</strong> of order delivery. Producer funds remain on hold during this window and are released to the producer wallet only after it expires without a return claim.</p>

        <h2 className="text-xl font-semibold">2. Eligible Returns</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Damaged or defective goods on arrival</li>
          <li>Incorrect items shipped</li>
          <li>Significant variance from listing description</li>
          <li>Short or missing quantities</li>
        </ul>

        <h2 className="text-xl font-semibold">3. Non-Returnable</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Perishables once accepted in good condition</li>
          <li>Custom or made-to-order goods</li>
          <li>Items damaged after delivery due to mishandling</li>
        </ul>

        <h2 className="text-xl font-semibold">4. How to Request a Return</h2>
        <p>Open the order in your dashboard and click "Request Return". You'll receive an RMA number. Provide photos and a brief explanation. The producer has 48 hours to respond; admins mediate disputes.</p>

        <h2 className="text-xl font-semibold">5. Refund Method</h2>
        <p>Approved refunds are returned to the original payment method via Paystack. Bank transfers typically settle within 5–10 business days; card refunds within 7–14 days.</p>

        <h2 className="text-xl font-semibold">6. Partial Refunds</h2>
        <p>For partially damaged or short shipments, refunds may be issued pro-rata. Both parties must agree, or an admin will mediate.</p>

        <h2 className="text-xl font-semibold">7. Chargebacks</h2>
        <p>Initiating a chargeback without first contacting OdungaMarket support may result in account suspension. We work with Paystack to resolve disputes fairly.</p>

        <h2 className="text-xl function-semibold">8. Shipping Costs on Returns</h2>
        <p>If the return is due to producer error, return shipping is covered by the producer. Otherwise the wholesaler bears return shipping.</p>

        <h2 className="text-xl font-semibold">9. Cancellations</h2>
        <p>Orders may be cancelled at no cost before the producer marks them as shipped. After shipping, the return policy above applies.</p>

        <h2 className="text-xl font-semibold">10. Contact</h2>
        <p>Need help with a return? Email support@odungamarket.com or open a ticket from your dashboard.</p>
      </section>
    </main>
  );
}
