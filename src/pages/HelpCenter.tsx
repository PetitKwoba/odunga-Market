import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, MessageCircle, Package, CreditCard, Users, ShoppingCart, HelpCircle } from 'lucide-react';

const categories = [
  {
    id: 'getting-started',
    icon: HelpCircle,
    title: 'Getting Started',
    description: 'Learn the basics of using our platform',
    faqs: [
      {
        question: 'How do I create an account?',
        answer: 'Click on "Sign Up" in the top right corner and fill in your details. Choose your role (Producer, Wholesaler, or Referrer) based on how you want to use the platform.',
      },
      {
        question: 'What are the different user roles?',
        answer: 'Producers list and sell products in bulk. Wholesalers purchase products from producers. Referrers promote products and earn commissions. Admins manage the platform.',
      },
      {
        question: 'How long does account approval take?',
        answer: 'Producer and Wholesaler accounts typically get approved within 24 hours. Referrer accounts are activated immediately upon signup.',
      },
    ],
  },
  {
    id: 'orders',
    icon: ShoppingCart,
    title: 'Orders & Purchasing',
    description: 'Everything about placing and managing orders',
    faqs: [
      {
        question: 'What is the minimum order quantity (MOQ)?',
        answer: 'Each product has its own MOQ set by the producer. Check the product page for specific minimum order requirements.',
      },
      {
        question: 'How do I track my order?',
        answer: 'Go to your Wholesaler Dashboard to view all your orders. You can see the current status (Pending, Processing, Shipped, or Completed) and track each order.',
      },
      {
        question: 'Can I cancel an order?',
        answer: 'Orders can only be cancelled while in "Pending" status. Once a producer starts processing, cancellation requires contacting support.',
      },
      {
        question: 'How do shipping costs work?',
        answer: 'Shipping costs are calculated based on your location and order weight. The final shipping cost is shown at checkout before payment.',
      },
    ],
  },
  {
    id: 'products',
    icon: Package,
    title: 'Products & Listings',
    description: 'Managing your product catalog',
    faqs: [
      {
        question: 'How do I add products as a producer?',
        answer: 'Go to your Producer Dashboard, click "Add Product", and fill in the product details including name, description, pricing, MOQ, and upload images.',
      },
      {
        question: 'Can I edit products after listing?',
        answer: 'Yes, you can edit your products anytime from your Producer Dashboard. Changes take effect immediately.',
      },
      {
        question: 'What are bulk pricing tiers?',
        answer: 'Bulk pricing allows you to offer discounts for larger quantities. Set different price points for different quantity ranges.',
      },
      {
        question: 'How many product images can I upload?',
        answer: 'You can upload up to 5 images per product. The first image becomes the main product thumbnail.',
      },
    ],
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Payments & Billing',
    description: 'Payment methods and financial information',
    faqs: [
      {
        question: 'What payment methods are accepted?',
        answer: 'We accept payments via Paystack, which supports credit/debit cards, bank transfers, and mobile money.',
      },
      {
        question: 'When do producers get paid?',
        answer: 'Producers receive payouts after order completion, minus platform fees and referral commissions (if applicable). Payouts are processed within 3-5 business days.',
      },
      {
        question: 'What are the platform fees?',
        answer: 'Platform fees vary by transaction volume. Check your dashboard for your specific fee structure or contact support for detailed pricing.',
      },
      {
        question: 'How do referral commissions work?',
        answer: 'Referrers earn commissions on sales made through their referral links. Commission rates are set by individual producers (fixed or percentage-based).',
      },
    ],
  },
  {
    id: 'referrals',
    icon: Users,
    title: 'Referral Program',
    description: 'Earning through referrals',
    faqs: [
      {
        question: 'How do I become a referrer?',
        answer: 'Sign up and select "Referrer" as your role. You\'ll get a unique referral code immediately after signup.',
      },
      {
        question: 'How do I share my referral link?',
        answer: 'Your referral code and link are available in your Referrer Dashboard. Share them on social media, websites, or directly with potential customers.',
      },
      {
        question: 'When do I receive my referral earnings?',
        answer: 'Referral commissions are credited after the referred order is completed. You can track your earnings in your dashboard.',
      },
      {
        question: 'Is there a limit to referrals?',
        answer: 'No, you can refer unlimited users and earn commissions on all their qualifying purchases.',
      },
    ],
  },
  {
    id: 'support',
    icon: MessageCircle,
    title: 'Customer Support',
    description: 'Getting help and resolving issues',
    faqs: [
      {
        question: 'How do I contact support?',
        answer: 'Create a support ticket from the Support page. You can also use the order chat feature for order-specific questions.',
      },
      {
        question: 'What are support response times?',
        answer: 'We aim to respond to all tickets within 24 hours during business days. Urgent issues are prioritized.',
      },
      {
        question: 'Can I dispute an order?',
        answer: 'Yes, you can raise a dispute from your order details page. Provide detailed information about the issue for faster resolution.',
      },
    ],
  },
];

export default function HelpCenter() {
  const [search, setSearch] = useState('');

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    faqs: cat.faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.faqs.length > 0);

  return (
    <div className="container py-8">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="mt-2 text-muted-foreground">Find answers to common questions</p>
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {search && filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HelpCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-2 font-semibold">No results found</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              We couldn't find any help articles matching your search.
              <br />
              Try different keywords or contact support.
            </p>
            <Button asChild>
              <Link to="/support">Contact Support</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {(search ? filteredCategories : categories).map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.faqs.map((faq, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`}>
                      <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <MessageCircle className="mb-4 h-10 w-10 text-muted-foreground/40" />
          <h3 className="mb-2 font-semibold">Still need help?</h3>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <Button asChild>
            <Link to="/support">Contact Support</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
